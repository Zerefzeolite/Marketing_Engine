"""
SMS Service - Plivo Integration

Provides SMS sending capabilities via Plivo API.
"""

import os
from typing import Optional
import httpx

PLIVO_AUTH_ID = os.getenv("PLIVO_AUTH_ID", "")
PLIVO_AUTH_TOKEN = os.getenv("PLIVO_AUTH_TOKEN", "")
PLIVO_PHONE_NUMBER = os.getenv("PLIVO_PHONE_NUMBER", "")

BASE_URL = "https://api.plivo.com/v1"


class SMSService:
    def __init__(self, auth_id: str = None, auth_token: str = None, phone_number: str = None):
        self.auth_id = auth_id or PLIVO_AUTH_ID
        self.auth_token = auth_token or PLIVO_AUTH_TOKEN
        self.phone_number = phone_number or PLIVO_PHONE_NUMBER
        self.enabled = bool(self.auth_id and self.auth_token)
    
    def _get_auth(self) -> tuple[str, str]:
        return (self.auth_id, self.auth_token)
    
    async def send_sms(
        self,
        to_number: str,
        message: str,
    ) -> dict:
        """
        Send an SMS via Plivo.
        
        Args:
            to_number: Recipient phone number (E.164 format, e.g., +18761234567)
            message: SMS text content
            
        Returns:
            dict with status and message_uuid
        """
        if not self.enabled:
            return {"status": "mock", "message_uuid": f"mock-{hash(to_number)}"}
        
        # Format phone number if needed
        if not to_number.startswith("+"):
            to_number = f"+1{to_number}"  # Default to US/Jamaica
        
        payload = {
            "src": self.phone_number,
            "dst": to_number,
            "text": message,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{BASE_URL}/Account/{self.auth_id}/Message/",
                    json=payload,
                    auth=self._get_auth(),
                    timeout=30.0,
                )
                
                if response.status_code in (200, 201, 202):
                    data = response.json()
                    return {
                        "status": "sent",
                        "message_uuid": data.get("message_uuid", ""),
                        "api_id": data.get("api_id", ""),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Plivo error: {response.status_code} - {response.text}",
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


sms_service = SMSService()