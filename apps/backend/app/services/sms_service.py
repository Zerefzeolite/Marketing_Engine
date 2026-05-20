import os
import time
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

SMS_MODE = os.getenv("SMS_MODE", "mock")  # mock | twilio | disabled | generic

# Twilio
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
VERIFIED_PHONE = os.getenv("VERIFIED_PHONE", "+18763549375")

# Generic HTTP provider
SMS_GENERIC_URL = os.getenv("SMS_GENERIC_URL", "")
SMS_GENERIC_API_KEY = os.getenv("SMS_GENERIC_API_KEY", "")
SMS_GENERIC_FROM = os.getenv("SMS_GENERIC_FROM", "")
SMS_GENERIC_FORMAT = os.getenv("SMS_GENERIC_FORMAT", "json")  # json or form

# Rate limiting
SMS_RATE_LIMIT_PER_MINUTE = int(os.getenv("SMS_RATE_LIMIT_PER_MINUTE", "10"))

# Cost tracking (USD per SMS)
SMS_COST_PER_SMS = float(os.getenv("SMS_COST_PER_SMS", "0.025"))

BASE_URL = "https://api.twilio.com/2010-04-01"


class SMSService:
    def __init__(self):
        self.mode = SMS_MODE
        self.twilio_sid = TWILIO_ACCOUNT_SID
        self.twilio_token = TWILIO_AUTH_TOKEN
        self.twilio_phone = TWILIO_PHONE_NUMBER
        self.verified_phone = VERIFIED_PHONE
        self.generic_url = SMS_GENERIC_URL
        self.generic_api_key = SMS_GENERIC_API_KEY
        self.generic_from = SMS_GENERIC_FROM
        self.generic_format = SMS_GENERIC_FORMAT

        # Rate limiting state
        self._minute_bucket: list[float] = []
        self._rate_limit = SMS_RATE_LIMIT_PER_MINUTE

        # Cost tracking
        self.cost_per_sms = SMS_COST_PER_SMS
        self.total_cost: float = 0.0
        self.total_sent: int = 0

    def _check_rate_limit(self) -> bool:
        now = time.time()
        self._minute_bucket = [t for t in self._minute_bucket if now - t < 60]
        if len(self._minute_bucket) >= self._rate_limit:
            return False
        self._minute_bucket.append(now)
        return True

    def _get_auth(self) -> tuple[str, str]:
        return (self.twilio_sid, self.twilio_token)

    def _format_jamaican_number(self, number: str) -> str:
        digits = "".join(c for c in number if c.isdigit())
        if len(digits) == 10 and digits[0] == "1":
            digits = digits[1:]
        if len(digits) == 7:
            return f"+1876{digits}"
        elif len(digits) == 10 and digits[0] == "1":
            return f"+{digits}"
        return f"+{digits}"

    async def send_sms(self, to_number: str, message: str) -> dict:
        if self.mode == "disabled":
            logger.info("[SMS] Disabled — skipping")
            return {"status": "skipped", "reason": "SMS mode is disabled"}

        if not self._check_rate_limit():
            logger.warning("[SMS] Rate limit exceeded")
            return {"status": "rate_limited", "error": "Rate limit exceeded (max {self._rate_limit}/min)"}

        if self.mode == "mock":
            logger.info(f"[SMS] Mock send to {to_number}: {message[:50]}...")
            self.total_sent += 1
            self.total_cost += self.cost_per_sms
            return {
                "status": "mock",
                "message_sid": f"mock-{hash(to_number)}",
                "to": to_number,
                "cost": self.cost_per_sms,
            }

        if self.mode == "twilio":
            return await self._send_via_twilio(to_number, message)

        if self.mode == "generic":
            return await self._send_via_generic(to_number, message)

        return {"status": "error", "error": f"Unknown SMS mode: {self.mode}"}

    async def _send_via_twilio(self, to_number: str, message: str) -> dict:
        if not all([self.twilio_sid, self.twilio_token, self.twilio_phone]):
            return {"status": "error", "error": "Twilio credentials not configured"}

        if self.verified_phone and to_number != self.verified_phone:
            return {
                "status": "trial_restricted",
                "message": f"Trial mode: can only send to {self.verified_phone}",
            }

        clean_number = self._format_jamaican_number(to_number)
        url = f"{BASE_URL}/Accounts/{self.twilio_sid}/Messages.json"
        payload = {"To": clean_number, "From": self.twilio_phone, "Body": message}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, data=payload, auth=self._get_auth(), timeout=30.0)
                if response.status_code in (200, 201):
                    data = response.json()
                    self.total_sent += 1
                    self.total_cost += self.cost_per_sms
                    logger.info(f"[SMS] Sent via Twilio to {to_number}")
                    return {"status": "sent", "message_sid": data.get("sid", ""), "to": data.get("to", ""), "cost": self.cost_per_sms}
                return {"status": "error", "error": f"Twilio error: {response.status_code}"}
            except Exception as e:
                return {"status": "error", "error": str(e)}

    async def _send_via_generic(self, to_number: str, message: str) -> dict:
        if not self.generic_url:
            return {"status": "error", "error": "SMS_GENERIC_URL not configured"}

        headers = {"Content-Type": "application/json"}
        if self.generic_api_key:
            headers["Authorization"] = f"Bearer {self.generic_api_key}"

        payload = {
            "to": to_number,
            "message": message,
            "from": self.generic_from or "MarketingEngine",
        }

        async with httpx.AsyncClient() as client:
            try:
                if self.generic_format == "form":
                    response = await client.post(self.generic_url, data=payload, headers=headers, timeout=30.0)
                else:
                    response = await client.post(self.generic_url, json=payload, headers=headers, timeout=30.0)

                if response.status_code in (200, 201, 202):
                    self.total_sent += 1
                    self.total_cost += self.cost_per_sms
                    logger.info(f"[SMS] Sent via generic provider to {to_number}")
                    return {"status": "sent", "to": to_number, "cost": self.cost_per_sms}
                return {"status": "error", "error": f"Provider error: {response.status_code}"}
            except Exception as e:
                return {"status": "error", "error": str(e)}

    async def send_campaign(self, recipients: list[dict]) -> dict:
        results = {"sent": 0, "failed": 0, "errors": [], "total_cost": 0.0}
        for recipient in recipients:
            phone = recipient.get("phone")
            message_text = recipient.get("message")
            if not phone or not message_text:
                results["failed"] += 1
                results["errors"].append("Missing phone or message")
                continue
            result = await self.send_sms(phone, message_text)
            if result.get("status") in ("sent", "mock"):
                results["sent"] += 1
                results["total_cost"] += result.get("cost", 0)
            else:
                results["failed"] += 1
                results["errors"].append(result.get("error", "Unknown error"))
        return results


sms_service = SMSService()
