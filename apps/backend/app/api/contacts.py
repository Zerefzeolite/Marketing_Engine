from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Literal
import json

from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["contacts"])

# ... existing code stays ...

@router.get("/audience-preview", response_model=dict)
def audience_preview(
    parish: str | None = Query(default=None),
    age_group: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    preferred_channel: str | None = Query(default=None),
    engagement_min: float | None = Query(default=None, ge=0.0, le=1.0),
    include_opt_out: bool = Query(default=False),
    limit: int = Query(default=1000, ge=1),
) -> dict:
    """Preview audience metrics without returning raw contacts."""
    contacts = contact_service.list_contacts(
        limit=10000,  # Get all for filtering
        offset=0,
        parish=parish,
        age_group=age_group,
        gender=gender,
        preferred_channel=preferred_channel,
        engagement_min=engagement_min,
        include_opt_out=include_opt_out,
    )
    
    # Apply filters
    filtered = contacts
    
    if parish:
        filtered = [c for c in filtered if c.get("parish") == parish]
    if age_group:
        filtered = [c for c in filtered if c.get("age_group") == age_group]
    if gender:
        filtered = [c for c in filtered if c.get("gender") == gender]
    if preferred_channel:
        filtered = [c for c in filtered if c.get("preferred_channel") == preferred_channel]
    if engagement_min is not None:
        filtered = [c for c in filtered if (c.get("engagement_score") or 0) >= engagement_min]
    if not include_opt_out:
        filtered = [c for c in filtered if not c.get("opt_out", False)]
    
    # Deduplicate by email
    seen_emails = set()
    unique = []
    for c in filtered:
        email = c.get("email")
        if email and email not in seen_emails:
            seen_emails.add(email)
            unique.append(c)
    
    # Limit results
    unique = unique[:limit]
    
    # Calculate metrics
    total = len(unique)
    channel_counts = {}
    parish_counts = {}
    age_group_counts = {}
    gender_counts = {}
    engagement_scores = []
    
    for c in unique:
        ch = c.get("preferred_channel", "unknown")
        channel_counts[ch] = channel_counts.get(ch, 0) + 1
        
        p = c.get("parish")
        if p:
            parish_counts[p] = parish_counts.get(p, 0) + 1
        
        ag = c.get("age_group")
        if ag:
            age_group_counts[ag] = age_group_counts.get(ag, 0) + 1
        
        g = c.get("gender")
        if g:
            gender_counts[g] = gender_counts.get(g, 0) + 1
        
        es = c.get("engagement_score")
        if es is not None:
            engagement_scores.append(es)
    
    avg_engagement = sum(engagement_scores) / len(engagement_scores) if engagement_scores else None
    
    return {
        "total_contacts": total,
        "channel_breakdown": channel_counts,
        "parish_breakdown": parish_counts,
        "age_group_breakdown": age_group_counts,
        "gender_breakdown": gender_counts,
        "avg_engagement_score": avg_engagement,
        "filters_applied": {
            "parish": parish,
            "age_group": age_group,
            "gender": gender,
            "preferred_channel": preferred_channel,
            "engagement_min": engagement_min,
            "include_opt_out": include_opt_out,
        }
    }


class CreateContactRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    source: Literal["import", "manual", "api"] = "manual"
    opt_out: bool = False
    # Targeting fields
    dob: str | None = None  # YYYY-MM-DD format
    age_group: Literal["18-25", "26-35", "36-50", "51+"] | None = None
    gender: Literal["male", "female", "non-binary", "prefer_not_to_say"] | None = None
    parish: str | None = None  # Jamaican parish
    preferred_channel: Literal["email", "sms", "both"] | None = None
    engagement_score: float | None = Field(default=None, ge=0.0, le=1.0)


class UpdateContactRequest(BaseModel):
    """All fields optional for partial updates."""
    email: EmailStr | None = None
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    tags: list[str] | None = None
    source: Literal["import", "manual", "api"] | None = None
    opt_out: bool | None = None
    # Targeting fields (all optional)
    dob: str | None = None
    age_group: Literal["18-25", "26-35", "36-50", "51+"] | None = None
    gender: Literal["male", "female", "non-binary", "prefer_not_to_say"] | None = None
    parish: str | None = None
    preferred_channel: Literal["email", "sms", "both"] | None = None
    engagement_score: float | None = Field(default=None, ge=0.0, le=1.0)


class ImportContactRequest(BaseModel):
    contacts: list[dict]
    default_campaign_id: str | None = None


class ContactResponse(BaseModel):
    contact_id: str
    email: str
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    source: str = "manual"
    opt_out: bool = False
    # Targeting fields
    dob: str | None = None
    age_group: str | None = None
    gender: str | None = None
    parish: str | None = None
    preferred_channel: str | None = None
    engagement_score: float | None = None
    created_at: str
    updated_at: str | None = None


@router.post("", response_model=ContactResponse)
def create_contact(req: CreateContactRequest) -> ContactResponse:
    result = contact_service.create_contact(
        email=req.email,
        phone=req.phone,
        first_name=req.first_name,
        last_name=req.last_name,
        tags=req.tags,
        source=req.source,
        opt_out=req.opt_out,
        dob=req.dob,
        age_group=req.age_group,
        gender=req.gender,
        parish=req.parish,
        preferred_channel=req.preferred_channel,
        engagement_score=req.engagement_score,
    )
    return ContactResponse.model_validate(result)


@router.get("", response_model=list[ContactResponse])
def list_contacts(
    campaign_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    tags: str | None = Query(default=None, description="Comma-separated tags"),
    opt_out: bool | None = Query(default=None),
    source: str | None = Query(default=None),
    parish: str | None = Query(default=None),
    age_group: str | None = Query(default=None),
    gender: str | None = Query(default=None),
    preferred_channel: str | None = Query(default=None),
    engagement_min: float | None = Query(default=None, ge=0.0, le=1.0),
) -> list[ContactResponse]:
    tag_list = tags.split(",") if tags else None
    results = contact_service.list_contacts(
        campaign_id=campaign_id,
        limit=limit,
        offset=offset,
        tags=tag_list,
        opt_out=opt_out,
        source=source,
        parish=parish,
        age_group=age_group,
        gender=gender,
        preferred_channel=preferred_channel,
        engagement_min=engagement_min,
    )
    return [ContactResponse.model_validate(r) for r in results]


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: str) -> ContactResponse:
    result = contact_service.get_contact(contact_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse.model_validate(result)


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: str, req: UpdateContactRequest) -> ContactResponse:
    """Update a contact (partial update, only provided fields)."""
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    # Pass update_data as a dict to update_contact
    result = contact_service.update_contact(contact_id, **update_data)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse.model_validate(result)


@router.delete("/{contact_id}")
def delete_contact(contact_id: str) -> dict:
    success = contact_service.delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"deleted": contact_id}


@router.post("/import", response_model=dict)
def import_contacts(req: ImportContactRequest) -> dict:
    result = contact_service.import_contacts(
        rows=req.contacts,
        default_campaign_id=req.default_campaign_id,
    )
    return result


@router.post("/{contact_id}/tag")
def add_tag(contact_id: str, tag: str) -> dict:
    result = contact_service.add_tag(contact_id, tag)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"tags": result.get("tags", [])}


@router.delete("/{contact_id}/tag/{tag}")
def remove_tag(contact_id: str, tag: str) -> dict:
    result = contact_service.remove_tag(contact_id, tag)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"tags": result.get("tags", [])}


@router.put("/{contact_id}/opt-out")
def set_opt_out(contact_id: str, opt_out: bool = True) -> dict:
    result = contact_service.set_opt_out(contact_id, opt_out)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"opt_out": result.get("opt_out")}
