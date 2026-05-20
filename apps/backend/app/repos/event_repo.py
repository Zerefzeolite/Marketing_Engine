"""
Campaign Events repository — hybrid JSON/DB backend.
"""

import sys
from pathlib import Path
from typing import List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))

from app.db import HybridRepo, USE_DB, _json_load
from app.db_schema import CampaignEvent, CampaignEventType

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
EVENTS_FILE = DATA_DIR / "contact_interactions.json"


class EventRepo:
    """Events stored as JSON array per contact; DB stores as rows."""

    @classmethod
    def add_event(cls, campaign_id: str, contact_id: str,
                 event_type: str, channel: str = None, metadata: dict = None) -> dict:
        if USE_DB:
            from app.db import SessionLocal
            from app.db_schema import CampaignEvent, CampaignEventType
            with SessionLocal() as s:
                event = CampaignEvent(
                    campaign_id=campaign_id,
                    contact_id=contact_id,
                    event_type=CampaignEventType(event_type),
                    channel=channel,
                    event_metadata=metadata or {},
                )
                s.add(event)
                s.commit()
                return {
                    "id": event.id,
                    "campaign_id": campaign_id,
                    "contact_id": contact_id,
                    "event_type": event_type,
                }

        # JSON fallback — append to contact_interactions.json
        data = _json_load(EVENTS_FILE)
        if contact_id not in data:
            data[contact_id] = []
        event = {
            "campaign_id": campaign_id,
            "event_type": event_type,
            "channel": channel,
            "timestamp": "now",
            "metadata": metadata or {},
        }
        data[contact_id].append(event)
        from app.db import _json_save
        _json_save(EVENTS_FILE, data)
        return event

    @classmethod
    def get_events(cls, contact_id: Optional[str] = None,
                   campaign_id: Optional[str] = None) -> List[dict]:
        if USE_DB:
            from app.db import SessionLocal
            with SessionLocal() as s:
                q = s.query(CampaignEvent)
                if contact_id:
                    q = q.filter(CampaignEvent.contact_id == contact_id)
                if campaign_id:
                    q = q.filter(CampaignEvent.campaign_id == campaign_id)
                rows = q.all()
                return [{
                    "id": r.id,
                    "campaign_id": r.campaign_id,
                    "contact_id": r.contact_id,
                    "event_type": r.event_type.value if r.event_type else None,
                    "channel": r.channel,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                } for r in rows]

        # JSON fallback
        data = _json_load(EVENTS_FILE)
        events = []
        for cid, evs in data.items():
            if contact_id and cid != contact_id:
                continue
            for ev in evs:
                if campaign_id and ev.get("campaign_id") != campaign_id:
                    continue
                events.append({"contact_id": cid, **ev})
        return events
