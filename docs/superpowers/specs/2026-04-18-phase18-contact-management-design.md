# Phase 18: Contact Management - Design

## Overview
Add contact management capabilities - import, view, and manage contacts for campaigns.

## Goals
1. Contact list storage
2. Import contacts (CSV upload)
3. View contact list
4. Contact segmentation

## Scope

### In Scope
- Contact CRUD operations
- CSV import
- Contact list view
- campaign-contact association

### Out of Scope
- Advanced segmentation
- Contact deduplication
- External CRM integration

## Data Model

```json
{
  "contact_id": "CNT-001",
  "email": "user@example.com",
  "phone": "+1234567890",
  "name": "John Doe",
  "campaigns": ["CMP-001"],
  "created_at": "2026-04-01T00:00:00Z"
}
```

## API Endpoints
- `POST /api/contacts` - Create contact
- `GET /api/contacts` - List contacts
- `POST /api/contacts/import` - Bulk import
- `GET /api/contacts/{id}` - Get contact
- `DELETE /api/contacts/{id}` - Delete contact

## Acceptance Criteria
- [x] Contacts stored in database
- [x] Can list contacts with pagination
- [x] Can import from CSV
- [x] Can associate contacts with campaigns