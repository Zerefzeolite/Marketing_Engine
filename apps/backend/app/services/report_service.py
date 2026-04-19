from app.services import analytics_service, dispatch_service


def build_report(campaign_id: str) -> dict[str, object]:
    campaign = dispatch_service.get_campaign_for_dispatch(campaign_id)
    dispatch_ready = (
        campaign.get("payment_status") == "COMPLETED"
        and campaign.get("content_approval_status") == "APPROVED_BY_HUMAN"
        and bool(campaign.get("is_locked"))
    )

    metrics = analytics_service.get_campaign_metrics(campaign_id)

    return {
        "campaign_id": campaign_id,
        "delivery": metrics.get("delivery", {"sent": 0, "delivered": 0, "failed": 0}),
        "interactions": metrics.get("interactions", {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0}),
        "consent_summary": metrics.get("consent_summary", {"opted_in": 0, "opted_out": 0}),
        "audience_fit_observations": [],
        "timing_performance_insights": [],
        "recommendations": [],
        "dispatch_ready": dispatch_ready,
    }