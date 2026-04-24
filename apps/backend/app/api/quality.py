from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/quality", tags=["quality"])


class TrackResponseRequest(BaseModel):
    contact_id: str
    campaign_id: str
    channel: str
    event_type: str


class QualityScoreResponse(BaseModel):
    contact_id: str
    quality_score: float
    quality_tier: str


@router.post("/track")
async def track_response(request: TrackResponseRequest):
    from app.services.quality_service import quality_service
    
    quality_service.track_response(
        request.contact_id,
        request.campaign_id,
        request.channel,
        request.event_type
    )
    return {"status": "tracked"}


@router.get("/{contact_id}/score", response_model=QualityScoreResponse)
async def get_quality_score(contact_id: str):
    from app.services.quality_service import quality_service
    
    score = quality_service.get_contact_quality_score(contact_id)
    tier = "high_value" if score >= 1.5 else "responsive" if score >= 1.2 else "standard"
    
    return QualityScoreResponse(
        contact_id=contact_id,
        quality_score=score,
        quality_tier=tier
    )