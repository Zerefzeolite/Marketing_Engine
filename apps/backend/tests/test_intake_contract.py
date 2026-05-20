from pydantic import ValidationError

from app.models.intake import IntakeSubmitRequest


def test_intake_requires_campaign_objective() -> None:
    try:
        IntakeSubmitRequest.model_validate(
            {
                "business_name": "Demo Co",
                "contact_email": "owner@demo.co",
                "preferred_channel": "email",
                "budget_min": 500,
            }
        )
        assert False, "expected validation error"
    except ValidationError:
        assert True


def test_intake_rejects_invalid_email() -> None:
    try:
        IntakeSubmitRequest.model_validate(
            {
                "business_name": "Demo Co",
                "contact_email": "owner-at-demo.co",
                "campaign_objective": "Promote",
                "preferred_channel": "email",
                "budget_min": 500,
            }
        )
        assert False, "expected validation error"
    except ValidationError:
        assert True


def test_intake_rejects_invalid_channel() -> None:
    try:
        IntakeSubmitRequest.model_validate(
            {
                "business_name": "Demo Co",
                "contact_email": "owner@demo.co",
                "campaign_objective": "Promote",
                "preferred_channel": "push",
                "budget_min": 500,
            }
        )
        assert False, "expected validation error"
    except ValidationError:
        assert True
