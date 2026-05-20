import pytest
from app.models.payment import (
    PaymentMethod,
    PaymentStatus,
    PaymentSubmitRequest,
    PaymentVerifyRequest,
    ConsentRequest,
    CampaignExecuteRequest,
    ExecutionStatus,
)


class TestPaymentModels:
    def test_payment_submit_request_valid(self):
        req = PaymentSubmitRequest(
            request_id="REQ-12345678",
            amount=5000,
            method=PaymentMethod.LOCAL_BANK_TRANSFER,
        )
        assert req.request_id == "REQ-12345678"
        assert req.amount == 5000
        assert req.method == PaymentMethod.LOCAL_BANK_TRANSFER

    def test_payment_submit_request_invalid_request_id(self):
        with pytest.raises(ValueError, match="must start with 'REQ-"):
            PaymentSubmitRequest(
                request_id="INVALID",
                amount=5000,
                method=PaymentMethod.STRIPE,
            )

    def test_payment_verify_request_approve(self):
        req = PaymentVerifyRequest(
            payment_id="PAY-12345678",
            action="approve",
            admin_notes="Verified manually",
        )
        assert req.action == "approve"

    def test_payment_verify_request_reject(self):
        req = PaymentVerifyRequest(
            payment_id="PAY-12345678",
            action="reject",
        )
        assert req.action == "reject"

    def test_consent_request_valid(self):
        req = ConsentRequest(
            request_id="REQ-12345678",
            consent_to_marketing=True,
            terms_accepted=True,
            data_processing_consent=True,
        )
        assert req.terms_accepted is True
        assert req.data_processing_consent is True

    def test_consent_request_terms_not_accepted(self):
        with pytest.raises(ValueError, match="terms_accepted must be true"):
            ConsentRequest(
                request_id="REQ-12345678",
                consent_to_marketing=False,
                terms_accepted=False,
                data_processing_consent=True,
            )

    def test_campaign_execute_request(self):
        req = CampaignExecuteRequest(
            request_id="REQ-12345678",
            campaign_data={"channels": ["email"], "target_count": 100},
        )
        assert req.request_id == "REQ-12345678"


class TestPaymentFlow:
    def test_payment_method_enum_values(self):
        assert PaymentMethod.LOCAL_BANK_TRANSFER.value == "LOCAL_BANK_TRANSFER"
        assert PaymentMethod.CASH.value == "CASH"
        assert PaymentMethod.STRIPE.value == "STRIPE"
        assert PaymentMethod.PAYPAL.value == "PAYPAL"

    def test_payment_status_enum_values(self):
        assert PaymentStatus.PENDING.value == "PENDING"
        assert PaymentStatus.COMPLETED.value == "COMPLETED"
        assert PaymentStatus.FAILED.value == "FAILED"
        assert PaymentStatus.REFUNDED.value == "REFUNDED"

    def test_execution_status_enum_values(self):
        assert ExecutionStatus.PENDING.value == "PENDING"
        assert ExecutionStatus.RUNNING.value == "RUNNING"
        assert ExecutionStatus.COMPLETED.value == "COMPLETED"
        assert ExecutionStatus.FAILED.value == "FAILED"
