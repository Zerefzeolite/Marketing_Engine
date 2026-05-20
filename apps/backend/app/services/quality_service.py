import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.models.contact_quality import ContactQuality


QUALITY_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "contact_quality.json"


class QualityService:
    def __init__(self):
        self._quality_store: dict[str, dict[str, ContactQuality]] = {}
        self._load()
    
    def _load(self) -> None:
        if not QUALITY_FILE.exists():
            self._quality_store = {}
            return
        try:
            with open(QUALITY_FILE) as f:
                raw = json.load(f)
            self._quality_store = {}
            for contact_id, campaigns in raw.items():
                self._quality_store[contact_id] = {}
                for campaign_id, data in campaigns.items():
                    self._quality_store[contact_id][campaign_id] = ContactQuality(
                        contact_id=data.get("contact_id", contact_id),
                        campaign_id=data.get("campaign_id", campaign_id),
                        email_sent=data.get("email_sent", 0),
                        email_opened=data.get("email_opened", 0),
                        email_clicked=data.get("email_clicked", 0),
                        sms_sent=data.get("sms_sent", 0),
                        sms_delivered=data.get("sms_delivered", 0),
                        conversions=data.get("conversions", 0),
                        last_updated=datetime.fromisoformat(data.get("last_updated", datetime.utcnow().isoformat())),
                    )
        except (json.JSONDecodeError, KeyError, TypeError):
            self._quality_store = {}
    
    def _save(self) -> None:
        raw: dict[str, dict] = {}
        for contact_id, campaigns in self._quality_store.items():
            raw[contact_id] = {}
            for campaign_id, quality in campaigns.items():
                raw[contact_id][campaign_id] = {
                    "contact_id": quality.contact_id,
                    "campaign_id": quality.campaign_id,
                    "email_sent": quality.email_sent,
                    "email_opened": quality.email_opened,
                    "email_clicked": quality.email_clicked,
                    "sms_sent": quality.sms_sent,
                    "sms_delivered": quality.sms_delivered,
                    "conversions": quality.conversions,
                    "last_updated": quality.last_updated.isoformat(),
                }
        QUALITY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QUALITY_FILE, "w") as f:
            json.dump(raw, f, indent=2)
    
    def track_response(
        self,
        contact_id: str,
        campaign_id: str,
        channel: str,
        event_type: str
    ) -> ContactQuality:
        key = f"{contact_id}"
        if key not in self._quality_store:
            self._quality_store[key] = {}
        
        if campaign_id not in self._quality_store[key]:
            self._quality_store[key][campaign_id] = ContactQuality(
                contact_id=contact_id,
                campaign_id=campaign_id,
                last_updated=datetime.utcnow()
            )
        
        quality = self._quality_store[key][campaign_id]
        
        if channel == "email":
            if event_type == "sent":
                quality.email_sent += 1
            elif event_type == "opened":
                quality.email_opened += 1
            elif event_type == "clicked":
                quality.email_clicked += 1
        elif channel == "sms":
            if event_type == "sent":
                quality.sms_sent += 1
            elif event_type == "delivered":
                quality.sms_delivered += 1
        
        if event_type == "conversion":
            quality.conversions += 1
        
        quality.last_updated = datetime.utcnow()
        self._save()
        return quality
    
    def get_contact_quality_score(self, contact_id: str) -> float:
        if contact_id not in self._quality_store:
            return 1.0
        
        campaigns = self._quality_store[contact_id].values()
        if not campaigns:
            return 1.0
        
        total_rate = sum(c.response_rate for c in campaigns)
        avg_rate = total_rate / len(campaigns)
        
        if avg_rate >= 0.5:
            return 1.6
        elif avg_rate >= 0.2:
            return 1.3
        else:
            return 1.0


quality_service = QualityService()