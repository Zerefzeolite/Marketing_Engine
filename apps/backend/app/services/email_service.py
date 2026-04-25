"""
Email Service - Mailchimp Integration

Provides email sending capabilities via Mailchimp Transactional API.
"""

import os
from typing import Optional
import httpx

MAILCHIMP_API_KEY = os.getenv("MAILCHIMP_API_KEY", "")
MAILCHIMP_SERVER = os.getenv("MAILCHIMP_SERVER", "us1")  # e.g., us1, us2
MAILCHIMP_DOMAIN = os.getenv("MAILCHIMP_DOMAIN", "yourdomain.com")

BASE_URL = f"https://{MAILCHIMP_SERVER}.api.mailchimp.com/3.0"


class EmailService:
    def __init__(self, api_key: str = None, server: str = None):
        self.api_key = api_key or MAILCHIMP_API_KEY
        self.server = server or MAILCHIMP_SERVER
        self.base_url = f"https://{self.server}.api.mailchimp.com/3.0"
        self.enabled = bool(self.api_key)
    
    def _get_headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self.api_key}",
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
        Send an email via Mailchimp Transactional (Mandrill).
        
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
        
        from_email = from_email or os.getenv("DEFAULT_FROM_EMAIL", "noreply@yourdomain.com")
        from_name = from_name or os.getenv("DEFAULT_FROM_NAME", "Marketing Engine")
        
        payload = {
            "message": {
                "html": html_content,
                "subject": subject,
                "from_email": from_email,
                "from_name": from_name,
                "to": [
                    {
                        "email": to_email,
                        "type": "to"
                    }
                ],
            }
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.base_url}/messages/send",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": "sent",
                        "message_id": data.get("_id", ""),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Mailchimp error: {response.status_code} - {response.text}",
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


email_service = EmailService()