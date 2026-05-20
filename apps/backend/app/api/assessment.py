from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.assessment import DomainName, RetestResult, Severity
from app.services import assessment_service


router = APIRouter(prefix="/assessment", tags=["phase6-assessment"])


class CreateFindingRequest(BaseModel):
    domain: DomainName
    title: str = Field(min_length=3)
    severity: Severity
    owner: str = Field(min_length=2)


class RetestRequest(BaseModel):
    result: RetestResult
    evidence: list[str] = Field(default_factory=list)


class CloseFindingRequest(BaseModel):
    notes: str = Field(min_length=2)


@router.get("/findings")
def list_findings() -> list[dict[str, object]]:
    return assessment_service.list_findings()


@router.post("/findings")
def create_finding(req: CreateFindingRequest) -> dict[str, object]:
    return assessment_service.create_finding(
        domain=req.domain,
        title=req.title,
        severity=req.severity,
        owner=req.owner,
    )


@router.post("/findings/{finding_id}/retest")
def record_retest(finding_id: str, req: RetestRequest) -> dict[str, object]:
    try:
        return assessment_service.record_retest(
            finding_id=finding_id,
            result=req.result,
            evidence=req.evidence,
        )
    except assessment_service.FindingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except assessment_service.InvalidFindingStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/findings/{finding_id}/close")
def close_finding(finding_id: str, req: CloseFindingRequest) -> dict[str, object]:
    try:
        return assessment_service.close_finding(finding_id=finding_id, notes=req.notes)
    except assessment_service.FindingNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except assessment_service.InvalidFindingStateError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
