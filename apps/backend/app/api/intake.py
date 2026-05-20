from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal, cast

from app.models.intake import IntakeSubmitRequest, IntakeSubmitResponse
from app.services.intake_service import estimate_summary, new_request_id, recommend_summary, save_submission

router = APIRouter(prefix="/intake", tags=["intake"])


class IntakeEstimateRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str = Field(min_length=1)


class IntakeEstimateResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    request_id: str = Field(min_length=1)
    estimated_reachable: int
    channel_split: str
    confidence: str


class IntakeRecommendRequest(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    estimated_reachable: int
    budget_min: int = Field(ge=0)


class IntakeRecommendResponse(BaseModel):
    schema_version: Literal["1.0"] = "1.0"
    recommended_package: Literal["starter", "growth", "premium"]
    rationale_summary: str = Field(min_length=1)


@router.post("/submit", response_model=IntakeSubmitResponse)
def submit(payload: IntakeSubmitRequest) -> IntakeSubmitResponse:
    request_id = new_request_id()
    payload_dict = payload.model_dump()
    save_submission(request_id, payload_dict)
    summary = {
        "business_name": payload.business_name,
        "preferred_channel": payload.preferred_channel,
    }
    return IntakeSubmitResponse(request_id=request_id, normalized_summary=summary)


@router.post("/estimate", response_model=IntakeEstimateResponse)
def estimate(payload: IntakeEstimateRequest) -> IntakeEstimateResponse:
    summary = estimate_summary(payload.request_id)
    return IntakeEstimateResponse(
        request_id=str(summary["request_id"]),
        estimated_reachable=int(summary["estimated_reachable"]),
        channel_split=str(summary["channel_split"]),
        confidence=str(summary["confidence"]),
    )


@router.post("/recommend", response_model=IntakeRecommendResponse)
def recommend(payload: IntakeRecommendRequest) -> IntakeRecommendResponse:
    summary = recommend_summary(payload.estimated_reachable, payload.budget_min)
    return IntakeRecommendResponse(
        schema_version=cast(Literal["1.0"], summary["schema_version"]),
        recommended_package=cast(
            Literal["starter", "growth", "premium"],
            summary["recommended_package"],
        ),
        rationale_summary=summary["rationale_summary"],
    )
