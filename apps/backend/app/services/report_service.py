from app.services import analytics_service, dispatch_service


def build_report(campaign_id: str) -> dict[str, object]:
    campaign = dispatch_service.get_campaign_for_dispatch(campaign_id)
    dispatch_ready = (
        campaign.get("payment_status") == "COMPLETED"
        and campaign.get("content_approval_status") == "APPROVED_BY_HUMAN"
        and bool(campaign.get("is_locked"))
    )

    metrics = analytics_service.get_campaign_metrics(campaign_id)

    delivery = metrics.get("delivery", {"sent": 0, "delivered": 0, "failed": 0})
    interactions = metrics.get("interactions", {"opens": 0, "clicks": 0, "replies": 0, "opt_outs": 0})
    consent_summary = metrics.get("consent_summary", {"opted_in": 0, "opted_out": 0})
    costs = metrics.get("costs", {})
    channels = metrics.get("channels", {})

    audience_fit_observations = _derive_audience_observations(delivery, interactions, consent_summary)
    timing_performance_insights = _derive_timing_insights(interactions, delivery)
    recommendations = _derive_recommendations(delivery, interactions, costs, consent_summary)

    return {
        "campaign_id": campaign_id,
        "delivery": delivery,
        "interactions": interactions,
        "consent_summary": consent_summary,
        "audience_fit_observations": audience_fit_observations,
        "timing_performance_insights": timing_performance_insights,
        "recommendations": recommendations,
        "dispatch_ready": dispatch_ready,
    }


def _derive_audience_observations(
    delivery: dict[str, int],
    interactions: dict[str, int],
    consent: dict[str, int],
) -> list[str]:
    obs: list[str] = []
    sent = delivery.get("sent", 0)
    failed = delivery.get("failed", 0)
    opt_outs = interactions.get("opt_outs", 0)

    if sent > 0 and failed > 0:
        fail_rate = failed / sent
        if fail_rate > 0.2:
            obs.append(f"High delivery failure rate ({fail_rate:.0%}) — check contact data quality")
        elif fail_rate > 0.05:
            obs.append(f"Moderate failure rate ({fail_rate:.0%}) — some contacts may have stale addresses")

    if opt_outs > 0 and sent > 0:
        opt_out_rate = opt_outs / sent
        if opt_out_rate > 0.1:
            obs.append(f"High opt-out rate ({opt_out_rate:.0%}) — audience targeting may need refinement")
        elif opt_out_rate > 0.03:
            obs.append(f"Moderate opt-out rate ({opt_out_rate:.0%}) — consider segmenting more carefully")

    if not obs:
        obs.append("Audience fit appears good — no delivery or consent issues detected")

    return obs


def _derive_timing_insights(
    interactions: dict[str, int],
    delivery: dict[str, int],
) -> list[str]:
    insights: list[str] = []
    sent = delivery.get("sent", 0)
    opens = interactions.get("opens", 0)
    clicks = interactions.get("clicks", 0)

    if sent > 0 and opens > 0:
        open_rate = opens / sent
        if open_rate > 0.3:
            insights.append(f"Strong open rate ({open_rate:.0%}) — subject lines and timing are working well")
        elif open_rate > 0.15:
            insights.append(f"Open rate ({open_rate:.0%}) is within typical range")
        else:
            insights.append(f"Open rate ({open_rate:.0%}) is low — consider A/B testing subject lines or send times")

    if opens > 0 and clicks > 0:
        ctr = clicks / opens
        if ctr > 0.2:
            insights.append(f"High click-through rate ({ctr:.0%} of opens) — content is engaging")
        elif ctr > 0.05:
            insights.append(f"Click-through rate ({ctr:.0%} of opens) is reasonable")
        else:
            insights.append(f"Low click-through rate ({ctr:.0%} of opens) — consider clearer calls to action")

    if not insights:
        insights.append("Insufficient data for timing analysis — more campaign activity needed")

    return insights


def _derive_recommendations(
    delivery: dict[str, int],
    interactions: dict[str, int],
    costs: dict[str, float],
    consent: dict[str, int],
) -> list[str]:
    recs: list[str] = []
    sent = delivery.get("sent", 0)
    failed = delivery.get("failed", 0)

    if sent > 0 and failed / sent > 0.1:
        recs.append("Clean your contact list — remove or re-verify addresses with delivery failures")

    opens = interactions.get("opens", 0)
    if sent > 0 and opens / sent < 0.15:
        recs.append("Improve open rates by testing different subject lines and preview text")

    opt_outs = interactions.get("opt_outs", 0)
    if sent > 0 and opt_outs / sent > 0.05:
        recs.append("Review audience segmentation to reduce opt-outs — consider preference centers")

    roi = costs.get("roi", 0)
    if roi > 2:
        recs.append(f"Current ROI ({roi:.1f}x) is strong — consider increasing campaign budget")
    elif roi > 0 and roi < 1:
        recs.append(f"ROI is below break-even ({roi:.1f}x) — review cost structure and conversion funnel")

    if not recs:
        recs.append("No specific recommendations — current campaign metrics are healthy")

    return recs