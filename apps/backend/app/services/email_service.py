"""
Email Service - Brevo Integration

Provides email sending capabilities via Brevo (formerly Sendinblue) API.
Free tier: 300 emails/day
"""

import os
from typing import Optional
import httpx

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@yourdomain.com")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Marketing Engine")

BASE_URL = "https://api.brevo.com/v3"


class EmailService:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or BREVO_API_KEY
        self.enabled = bool(self.api_key)
    
    def _get_headers(self) -> dict:
        return {
            "api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        from_email: str = None,
        from_name: str = None,
    ) -> dict:
        """
        Send an email via Brevo.
        
        Args:
            to_email: Recipient email address
            subject: Email subject line
            html_content: HTML body content
            from_email: Sender email (defaults to configured)
            from_name: Sender name
            
        Returns:
            dict with status and message_id
        """
        if not self.enabled:
            return {"status": "mock", "message_id": f"mock-{hash(to_email)}"}
        
        from_email = from_email or BREVO_SENDER_EMAIL
        from_name = from_name or BREVO_SENDER_NAME
        
        payload = {
            "sender": {
                "email": from_email,
                "name": from_name,
            },
            "to": [
                {
                    "email": to_email,
                }
            ],
            "subject": subject,
            "htmlContent": html_content,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{BASE_URL}/smtp/email",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                
                if response.status_code == 201:
                    data = response.json()
                    return {
                        "status": "sent",
                        "message_id": data.get("messageId", ""),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Brevo error: {response.status_code} - {response.text}",
                    }
            except Exception as e:
                return {
                    "status": "error",
                    "error": str(e),
                }
    
    async def send_campaign(
        self,
        recipients: list[str],
        subject: str,
        html_content: str,
    ) -> dict:
        """
        Send to multiple recipients.
        
        Args:
            recipients: List of email addresses
            subject: Email subject
            html_content: HTML body
            
        Returns:
            dict with sent count and any errors
        """
        results = {
            "sent": 0,
            "failed": 0,
            "errors": [],
        }
        
        for email in recipients:
            result = await self.send_email(email, subject, html_content)
            if result.get("status") == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(result.get("error", "Unknown error"))
        
        return results
    
    async def get_credits(self) -> dict:
        """Get remaining email credits"""
        if not self.enabled:
            return {"remaining": "unlimited (mock)"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{BASE_URL}/account",
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "remaining": data.get("email", {}).get("remaining", "unknown"),
                        "plan": data.get("plan", {}).get("name", "unknown"),
                    }
            except Exception:
                pass
        
        return {"remaining": "unknown"}


email_service = EmailService()