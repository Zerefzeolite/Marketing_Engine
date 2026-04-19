import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.services import campaign_service


PAYMENT_LINK_STORAGE_FILE = Path("data/payment_links.json")


class PaymentLinkNotAllowedError(Exception):
    pass


def _to_utc_iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _load_payment_links() -> dict[str, dict]:
    if not PAYMENT_LINK_STORAGE_FILE.exists():
        return {}

    try:
        with PAYMENT_LINK_STORAGE_FILE.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (json.JSONDecodeError, OSError):
        return {}

    if not isinstance(payload, dict):
        return {}

    return {key: value for key, value in payload.items() if isinstance(key, str) and isinstance(value, dict)}


def _save_payment_links(payment_links: dict[str, dict]) -> None:
    PAYMENT_LINK_STORAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with PAYMENT_LINK_STORAGE_FILE.open("w", encoding="utf-8") as handle:
        json.dump(payment_links, handle, indent=2)


def create_payment_link(campaign_id: str, method: str, amount: int, provider_mode: str = "test") -> dict[str, str | int]:
    sessions = campaign_service._load_sessions()
    
    session = None
    for sid, sess in sessions.items():
        if sid.replace("SES-", "CMP-") == campaign_id or sid == campaign_id:
            session = sess
            break
    
    if session is None:
        session = sessions.get(campaign_id)
    
    if session is None:
        raise PaymentLinkNotAllowedError("Campaign session not found")

    status = session.get("status", "")
    
    if status not in ("ACTIVE", "PASS", "APPROVED"):
        raise PaymentLinkNotAllowedError(
            f"Payment link not allowed. Campaign status is '{status}'. "
            "Campaign must pass moderation or receive manual approval before payment."
        )

    mode_token = "live" if provider_mode == "live" else "test"

    if method == "STRIPE_LINK":
        provider = "stripe"
        payment_url = f"https://checkout.stripe.com/pay/{mode_token}_{campaign_id}"
    elif method == "PAYPAL_LINK":
        provider = "paypal"
        paypal_domain = "www.paypal.com" if provider_mode == "live" else "www.sandbox.paypal.com"
        payment_url = f"https://{paypal_domain}/checkoutnow?token={mode_token}_{campaign_id}"
    else:
        raise ValueError("Unsupported link payment method")

    payment_link_id = f"PLINK-{uuid4().hex[:8].upper()}"
    record = {
        "payment_link_id": payment_link_id,
        "campaign_id": campaign_id,
        "method": method,
        "provider": provider,
        "provider_mode": provider_mode,
        "amount": amount,
        "payment_url": payment_url,
        "verification_status": "PENDING",
        "created_at": _to_utc_iso(datetime.now(UTC)),
    }

    payment_links = _load_payment_links()
    payment_links[payment_link_id] = record
    _save_payment_links(payment_links)

    return record
