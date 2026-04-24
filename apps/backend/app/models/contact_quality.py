from datetime import datetime
from pydantic import BaseModel, computed_field


class ContactQuality(BaseModel):
    contact_id: str
    campaign_id: str
    email_sent: int = 0
    email_opened: int = 0
    email_clicked: int = 0
    sms_sent: int = 0
    sms_delivered: int = 0
    conversions: int = 0
    last_updated: datetime

    @computed_field
    @property
    def response_rate(self) -> float:
        total_sent = self.email_sent + self.sms_sent
        if total_sent == 0:
            return 0.0
        total_engaged = self.email_opened + self.email_clicked + self.sms_delivered + self.conversions
        return total_engaged / total_sent