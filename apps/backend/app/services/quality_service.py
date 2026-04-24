from datetime import datetime
from typing import Optional

from app.models.contact_quality import ContactQuality


class QualityService:
    def __init__(self):
        self._quality_store: dict[str, dict[str, ContactQuality]] = {}
    
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