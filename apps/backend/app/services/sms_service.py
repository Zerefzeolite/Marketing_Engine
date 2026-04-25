"""
SMS Service - Twilio Integration

Provides SMS sending capabilities via Twilio API.
Works in Jamaica (Digicel & Flow networks).
"""

import os
from typing import Optional
import httpx

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Trial mode: only send to your verified number
# When upgrading Twilio, remove VERIFIED_PHONE restriction
VERIFIED_PHONE = os.getenv("VERIFIED_PHONE", "+18763549375")  # Your number for testing

BASE_URL = "https://api.twilio.com/2010-04-01"


class SMSService:
    def __init__(self, account_sid: str = None, auth_token: str = None, phone_number: str = None):
        self.account_sid = account_sid or TWILIO_ACCOUNT_SID
        self.auth_token = auth_token or TWILIO_AUTH_TOKEN
        self.phone_number = phone_number or TWILIO_PHONE_NUMBER
        self.enabled = bool(self.account_sid and self.auth_token)
    
    def _get_auth(self) -> tuple[str, str]:
        return (self.account_sid, self.auth_token)
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
    ) -> dict:
        """
        Send an SMS via Twilio.
        Works with Jamaican numbers (+1 876 xxx xxxx).
        
        Trial mode: Only sends to VERIFIED_PHONE number.
        """
        if not self.enabled:
            return {"status": "mock", "message_sid": f"mock-{hash(to_number)}"}
        
        # Trial mode: restrict to verified number only
        if VERIFIED_PHONE and to_number != VERIFIED_PHONE:
            return {
                "status": "trial_restricted",
                "message": f"Trial mode: can only send to {VERIFIED_PHONE}. Upgrade to send to all numbers.",
            }
        
        # Format phone number for Jamaica
        # Accept: +18761234567, 18761234567, 8761234567
        clean_number = to_number.replace("+", "").replace(" ", "").replace("-", "")
        if len(clean_number) == 10:
            clean_number = "1" + clean_number  # Add US country code
        if not clean_number.startswith("+"):
            clean_number = f"+{clean_number}"
        
        url = f"{BASE_URL}/Accounts/{self.account_sid}/Messages.json"
        
        payload = {
            "To": clean_number,
            "From": self.phone_number,
            "Body": message,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url,
                    data=payload,
                    auth=self._get_auth(),
                    timeout=30.0,
                )
                
                if response.status_code in (200, 201):
                    data = response.json()
                    return {
                        "status": "sent",
                        "message_sid": data.get("sid", ""),
                        "to": data.get("to", ""),
                        "status_callback": data.get("status", ""),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Twilio error: {response.status_code} - {response.text}",
                    }
            except Exception as e:
                return {
                    "status": "error",
                    "error": str(e),
                }
    
    async def send_campaign(
        self,
        recipients: list[dict],  # [{"phone": "+18761234567", "message": "..."}]
    ) -> dict:
        """
        Send to multiple recipients.
        
        Args:
            recipients: List of dicts with phone and message keys
            
        Returns:
            dict with sent count and any errors
        """
        results = {
            "sent": 0,
            "failed": 0,
            "errors": [],
        }
        
        for recipient in recipients:
            phone = recipient.get("phone")
            message = recipient.get("message")
            
            if not phone or not message:
                results["failed"] += 1
                results["errors"].append("Missing phone or message")
                continue
            
            result = await self.send_sms(phone, message)
            if result.get("status") == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(result.get("error", "Unknown error"))
        
        return results
    
    def format_jamaican_number(self, number: str) -> str:
        """Format a Jamaican number to E.164"""
        digits = "".join(c for c in number if c.isdigit())
        
        if len(digits) == 10 and digits[0] == "1":
            digits = digits[1:]  # Remove US prefix if present
        
        if len(digits) == 7:  # Local 7-digit
            return f"+1876{digits}"
        elif len(digits) == 10 and digits[0] == "1":  # US format
            return f"+{digits}"
        
        return f"+{digits}"  # Assume already has country code


sms_service = SMSService()