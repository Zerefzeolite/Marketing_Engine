import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


METRICS_STORAGE_FILE = Path("data/campaign_metrics.json")
CONTACT_INTERACTIONS_FILE = Path("data/contact_interactions.json")


def _to_utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _load_metrics() -> dict[str, dict]:
    if not METRICS_STORAGE_FILE.exists():
        return {}
    try:
        with METRICS_STORAGE_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_metrics(metrics: dict[str, dict]) -> None:
    METRICS_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with METRICS_STORAGE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(metrics, handle, indent=2)


def _load_contact_interactions() -> dict[str, dict]:
    if not CONTACT_INTERACTIONS_FILE.exists():
        return {}
    try:
        with CONTACT_INTERACTIONS_FILE.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_contact_interactions(data: dict[str, dict]) -> None:
    CONTACT_INTERACTIONS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONTACT_INTERACTIONS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def _contact_has_opted_out(contact_id: str, campaign_id: str) -> bool:
    contacts = _load_contact_interactions()
    contact = contacts.get(contact_id)
    if not isinstance(contact, dict):
        return False

    interactions = contact.get("campaign_interactions", [])
    if not isinstance(interactions, list):
        return False

    for interaction in interactions:
        if not isinstance(interaction, dict):
            continue
        if interaction.get("campaign_id") == campaign_id and interaction.get("opted_out") is True:
            return True

    return False


def record_event(campaign_id: str, contact_id: str, event_type: str) -> dict:
    metrics = _load_metrics()
    
    if campaign_id not in metrics:
        metrics[campaign_id] = {
            "campaign_id": campaign_id,
            "delivery": {"sent": 0, "delivered": 0, "failed": 0},
            "interactions": {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0},
            "consent_events": [],
            "updated_at": _to_utc_iso(datetime.now(UTC)),
        }
    
    campaign = metrics[campaign_id]

    if event_type == "SENT" and _contact_has_opted_out(contact_id=contact_id, campaign_id=campaign_id):
        campaign["updated_at"] = _to_utc_iso(datetime.now(UTC))
        _save_metrics(metrics)
        return campaign
    
    if event_type == "SENT":
        campaign["delivery"]["sent"] += 1
    elif event_type == "DELIVERED":
        campaign["delivery"]["delivered"] += 1
    elif event_type == "FAILED":
        campaign["delivery"]["failed"] += 1
    elif event_type == "OPENED":
        campaign["interactions"]["opens"] += 1
    elif event_type == "CLICKED":
        campaign["interactions"]["clicks"] += 1
    elif event_type == "REPLIED":
        campaign["interactions"]["replies"] += 1
    elif event_type == "OPT_OUT":
        campaign["interactions"]["opt_outs"] += 1
        campaign["consent_events"].append({
            "contact_id": contact_id,
            "campaign_id": campaign_id,
            "event_type": "OPT_OUT",
            "timestamp": _to_utc_iso(datetime.now(UTC)),
        })
    
    campaign["updated_at"] = _to_utc_iso(datetime.now(UTC))
    _save_metrics(metrics)
    
    _update_contact_interaction(contact_id, campaign_id, event_type)
    
    return campaign


def _update_contact_interaction(contact_id: str, campaign_id: str, event_type: str) -> None:
    contacts = _load_contact_interactions()
    
    if contact_id not in contacts:
        contacts[contact_id] = {
            "contact_id": contact_id,
            "campaign_interactions": [],
        }
    
    contact = contacts[contact_id]
    
    interaction = next(
        (c for c in contact["campaign_interactions"] if c["campaign_id"] == campaign_id),
        None,
    )
    
    if interaction is None:
        interaction = {
            "campaign_id": campaign_id,
            "delivered": False,
            "opened": False,
            "clicked": False,
            "replied": False,
            "opted_out": False,
            "first_open_at": None,
            "last_click_at": None,
        }
        contact["campaign_interactions"].append(interaction)
    
    if event_type == "DELIVERED":
        interaction["delivered"] = True
    elif event_type == "OPENED":
        interaction["opened"] = True
        if interaction["first_open_at"] is None:
            interaction["first_open_at"] = _to_utc_iso(datetime.now(UTC))
    elif event_type == "CLICKED":
        interaction["clicked"] = True
        interaction["last_click_at"] = _to_utc_iso(datetime.now(UTC))
    elif event_type == "REPLIED":
        interaction["replied"] = True
    elif event_type == "OPT_OUT":
        interaction["opted_out"] = True
    
    _save_contact_interactions(contacts)


def get_campaign_metrics(campaign_id: str) -> dict:
    metrics = _load_metrics()
    campaign = metrics.get(campaign_id)
    
    if campaign is None:
        return {
            "campaign_id": campaign_id,
            "delivery": {"sent": 0, "delivered": 0, "failed": 0},
            "interactions": {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0},
            "consent_summary": {"opted_in": 0, "opted_out": 0},
            "channels": {"email": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "sms": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "social": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}},
            "costs": {"spend": 0.0, "revenue": 0.0, "roi": 0.0, "cost_per_contact": 0.0, "cost_per_conversion": 0.0},
        }
    
    consent_summary = {
        "opted_in": campaign["delivery"].get("delivered", 0) - campaign["interactions"].get("opt_outs", 0),
        "opted_out": campaign["interactions"].get("opt_outs", 0),
    }
    
    channels = campaign.get("channels", {"email": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "sms": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "social": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}})
    costs = campaign.get("costs", {"spend": 0.0, "revenue": 0.0, "roi": 0.0, "cost_per_contact": 0.0, "cost_per_conversion": 0.0})
    
    return {
        "campaign_id": campaign_id,
        "delivery": campaign["delivery"],
        "interactions": campaign["interactions"],
        "consent_summary": consent_summary,
        "channels": channels,
        "costs": costs,
    }


def get_all_campaigns_metrics() -> list[dict]:
    metrics = _load_metrics()
    return list(metrics.values())


def get_aggregated_metrics() -> dict:
    metrics = _load_metrics()
    
    aggregated = {
        "delivery": {"sent": 0, "delivered": 0, "failed": 0},
        "interactions": {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0},
        "channels": {"email": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "sms": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}, "social": {"sent": 0, "delivered": 0, "opens": 0, "clicks": 0}},
        "costs": {"spend": 0.0, "revenue": 0.0, "roi": 0.0},
        "campaign_count": len(metrics),
    }
    
    for campaign in metrics.values():
        for key in aggregated["delivery"]:
            aggregated["delivery"][key] += campaign.get("delivery", {}).get(key, 0)
        for key in aggregated["interactions"]:
            aggregated["interactions"][key] += campaign.get("interactions", {}).get(key, 0)
        for channel in ["email", "sms", "social"]:
            for key in aggregated["channels"][channel]:
                aggregated["channels"][channel][key] += campaign.get("channels", {}).get(channel, {}).get(key, 0)
        aggregated["costs"]["spend"] += campaign.get("costs", {}).get("spend", 0.0)
        aggregated["costs"]["revenue"] += campaign.get("costs", {}).get("revenue", 0.0)
    
    if aggregated["costs"]["spend"] > 0:
        aggregated["costs"]["roi"] = ((aggregated["costs"]["revenue"] - aggregated["costs"]["spend"]) / aggregated["costs"]["spend"]) * 100
    
    total_contacts = aggregated["delivery"]["delivered"]
    total_conversions = aggregated["interactions"]["replies"]
    if total_contacts > 0:
        aggregated["costs"]["cost_per_contact"] = aggregated["costs"]["spend"] / total_contacts
    if total_conversions > 0:
        aggregated["costs"]["cost_per_conversion"] = aggregated["costs"]["spend"] / total_conversions
    
    return aggregated


def get_contact_interactions(contact_id: str) -> list[dict]:
    contacts = _load_contact_interactions()
    contact = contacts.get(contact_id)
    
    if contact is None:
        return []
    
    return contact.get("campaign_interactions", [])
