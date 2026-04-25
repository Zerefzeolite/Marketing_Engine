"""
Email Service - Brevo REST API Integration

Provides email sending via Brevo Transactional API.
Free tier: 300 emails/day
"""

import os
import httpx

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@yourdomain.com")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Marketing Engine")

BASE_URL = "https://api.brevo.com/v3"


class EmailService:
    def __init__(self):
        self.api_key = BREVO_API_KEY
        self.enabled = bool(self.api_key)
        self.sender_email = BREVO_SENDER_EMAIL
        self.sender_name = BREVO_SENDER_NAME
    
    def _get_headers(self) -> dict:
        return {
            "api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
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
        Send email via Brevo REST API.
        """
        if not self.enabled:
            return {"status": "mock", "message_id": f"mock-{hash(to_email)}"}
        
        from_email = from_email or self.sender_email
        from_name = from_name or self.sender_name
        
        payload = {
            "sender": {
                "email": from_email,
                "name": from_name,
            },
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": html_content,
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{BASE_URL}/smtp/email",
                    json=payload,
                    headers=self._get_headers(),
                    timeout=30.0,
                )
                
                if response.status_code in (200, 201):
                    data = response.json()
                    return {
                        "status": "sent",
                        "message_id": data.get("messageId", ""),
                    }
                else:
                    return {
                        "status": "error",
                        "error": f"Brevo {response.status_code}: {response.text[:200]}",
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
        results = {"sent": 0, "failed": 0, "errors": []}
        
        for email in recipients:
            result = await self.send_email(email, subject, html_content)
            if result.get("status") == "sent":
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append(result.get("error", "Unknown"))
        
        return results


email_service = EmailService()