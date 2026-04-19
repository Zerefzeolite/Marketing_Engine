from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field

from app.services import contact_service


router = APIRouter(prefix="/contacts", tags=["contacts"])


class CreateContactRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    phone: str | None = None
    campaign_ids: list[str] | None = None


class ImportContactRequest(BaseModel):
    rows: list[dict]
    default_campaign_id: str | None = None


class ContactResponse(BaseModel):
    contact_id: str
    email: str
    name: str | None = None
    phone: str | None = None
    campaigns: list[str]
    created_at: str


@router.post("", response_model=ContactResponse)
def create_contact(req: CreateContactRequest) -> ContactResponse:
    result = contact_service.create_contact(
        email=req.email,
        name=req.name,
        phone=req.phone,
        campaign_ids=req.campaign_ids,
    )
    return ContactResponse.model_validate(result)


@router.get("")
def list_contacts(
    campaign_id: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[ContactResponse]:
    results = contact_service.list_contacts(
        campaign_id=campaign_id,
        limit=limit,
        offset=offset,
    )
    return [ContactResponse.model_validate(r) for r in results]


@router.get("/{contact_id}", response_model=ContactResponse)
def get_contact(contact_id: str) -> ContactResponse:
    result = contact_service.get_contact(contact_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    return ContactResponse.model_validate(result)


@router.delete("/{contact_id}")
def delete_contact(contact_id: str) -> dict:
    success = contact_service.delete_contact(contact_id)
    if not success:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"deleted": contact_id}


@router.post("/import")
def import_contacts(req: ImportContactRequest) -> dict:
    result = contact_service.import_contacts(
        rows=req.rows,
        default_campaign_id=req.default_campaign_id,
    )
    return result