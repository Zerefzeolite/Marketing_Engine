from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import analytics_service


router = APIRouter(prefix="/campaigns", tags=["analytics"])


class CampaignEventRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    contact_id: str = Field(min_length=1)
    event_type: Literal["SENT", "DELIVERED", "FAILED", "OPENED", "CLICKED", "REPLIED", "OPT_OUT"]


class CampaignEventResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]


class CampaignMetricsResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]
    consent_summary: dict[str, int]
    channels: dict[str, dict[str, int]]
    costs: dict[str, float]


@router.post("/{campaign_id}/events", response_model=CampaignEventResponse)
def record_event(campaign_id: str, req: CampaignEventRequest) -> CampaignEventResponse:
    if campaign_id != req.campaign_id:
        raise HTTPException(status_code=400, detail="Campaign ID mismatch")
    
    result = analytics_service.record_event(
        campaign_id=req.campaign_id,
        contact_id=req.contact_id,
        event_type=req.event_type,
    )
    
    return CampaignEventResponse.model_validate(result)


@router.get("/{campaign_id}/metrics", response_model=CampaignMetricsResponse)
def get_campaign_metrics(campaign_id: str) -> CampaignMetricsResponse:
    result = analytics_service.get_campaign_metrics(campaign_id)
    return CampaignMetricsResponse.model_validate(result)


@router.get("/contacts/{contact_id}/interactions")
def get_contact_interactions(contact_id: str) -> list[dict]:
    return analytics_service.get_contact_interactions(contact_id)


class AggregatedMetricsResponse(BaseModel):
    delivery: dict[str, int]
    interactions: dict[str, int]
    channels: dict[str, dict[str, int]]
    costs: dict[str, float]
    campaign_count: int


@router.get("/metrics", response_model=list[CampaignMetricsResponse])
def get_all_campaigns_metrics() -> list[CampaignMetricsResponse]:
    results = analytics_service.get_all_campaigns_metrics()
    return [CampaignMetricsResponse.model_validate(r) for r in results]


@router.get("/aggregated", response_model=AggregatedMetricsResponse)
def get_aggregated_metrics() -> AggregatedMetricsResponse:
    result = analytics_service.get_aggregated_metrics()
    return AggregatedMetricsResponse.model_validate(result)