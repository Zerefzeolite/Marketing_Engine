from uuid import uuid4

from . import payment_service


def new_request_id() -> str:
    return f"REQ-{uuid4().hex[:8]}"


def estimate_summary(request_id: str) -> dict[str, int | str]:
    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "estimated_reachable": 1200,
        "channel_split": "email: 700, sms: 500",
        "confidence": "medium",
    }


def recommend_summary(estimated_reachable: int, budget_min: int) -> dict[str, str]:
    if estimated_reachable >= 1500 or budget_min >= 12000:
        package = "premium"
    elif estimated_reachable >= 800 or budget_min >= 5000:
        package = "growth"
    else:
        package = "starter"

    return {
        "schema_version": "1.0",
        "recommended_package": package,
        "rationale_summary": "Recommendation is based on budget and projected reach.",
    }


def get_flow_status(request_id: str) -> dict:
    """
    Returns the current flow status for a request.
    Shows what step the client is on and what's needed next.
    """
    has_consent = payment_service.has_consent(request_id)
    payment = payment_service.get_payment_by_request_id(request_id)
    payment_verified = payment_service.is_payment_verified(request_id) if payment else False
    
    if not has_consent:
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "consent",
            "next_action": "Record consent",
            "warning": None,
        }
    
    if not payment:
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "payment",
            "next_action": "Submit payment",
            "warning": None,
        }
    
    if not payment_verified:
        wait_warning = (
            "Bank transfer requires verification (24-48 hrs). "
            "Your campaign will launch after approval."
        )
        return {
            "schema_version": "1.0",
            "request_id": request_id,
            "current_step": "verification",
            "next_action": "Await admin approval",
            "warning": wait_warning,
        }
    
    return {
        "schema_version": "1.0",
        "request_id": request_id,
        "current_step": "ready",
        "next_action": "Execute campaign",
        "warning": None,
    }
