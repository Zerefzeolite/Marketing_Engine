from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse
from typing import Literal

from app.services import contact_service

router = APIRouter(prefix="/contacts", tags=["contacts"])


class CreateContactRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    tags: list[str] = Field(default_factory=list)
    source: Literal["import", "manual", "api"] = "manual"
    opt_out: bool = False


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
) -> list[ContactResponse]:
    tag_list = tags.split(",") if tags else None
    results = contact_service.list_contacts(
        campaign_id=campaign_id,
        limit=limit,
        offset=offset,
        tags=tag_list,
        opt_out=opt_out,
        source=source,
    )
    return [ContactResponse.model_validate(r) for r in results]


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: str) -> ContactResponse:
    result = contact_service.get_contact(contact_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse.model_validate(result)


@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: str, req: CreateContactRequest) -> ContactResponse:
    result = contact_service.update_contact(
        contact_id=contact_id,
        email=req.email,
        phone=req.phone,
        first_name=req.first_name,
        last_name=req.last_name,
        tags=req.tags,
        source=req.source,
        opt_out=req.opt_out,
    )
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
