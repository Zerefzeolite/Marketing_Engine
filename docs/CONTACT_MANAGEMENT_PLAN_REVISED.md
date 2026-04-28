# Contact Management - Revised Planning Document

**Date**: 2026-04-28  
**Status**: Planning Phase (Revised)  
**Priority**: 🟡 Important (Next after handoff)  
**Lead**: Next Developer

---

## 1. CURRENT STATE

### What Exists (Backend Complete)
| Feature | Status | Location |
|---------|--------|----------|
| Contact API | ✅ Complete | `apps/backend/app/api/contacts.py` |
| Contact Service | ✅ Complete | `apps/backend/app/services/contact_service.py` |
| Contact Model | ✅ Complete | `apps/backend/app/models/contact.py` |
| JSON Storage | ✅ Complete | `apps/backend/data/contacts.json` |
| Quality Tracking | ✅ Complete | `apps/backend/app/services/quality_service.py` |
| Interaction Tracking | ✅ Complete | `apps/backend/data/contact_interactions.json` |

### What's Missing (Frontend UI)
| Feature | Status | Notes |
|---------|--------|-------|
| Contact List Page | ❌ **Missing** | No `/contacts` page |
| Add/Edit Contact | ❌ **Missing** | No form UI |
| Contact Detail View | ❌ **Missing** | No profile page |
| Import Contacts | ❌ **Missing** | No bulk import UI |
| Tag Management | ❌ **Missing** | No tag UI |

### Existing API Endpoints (Ready to Use)
```
POST   /contacts              - Create single contact
GET    /contacts              - List contacts (with filters)
GET    /contacts/{id}         - Get contact details
DELETE /contacts/{id}         - Delete contact
POST   /contacts/import       - Bulk import contacts
GET    /api/quality/{id}/score - Get quality score
POST   /api/quality/track     - Track response
GET    /campaigns/contacts/{id}/interactions - Get interaction history
```

### Existing Data Model
```typescript
interface Contact {
  contact_id: string;          // CNT-xxxxxxxx
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  source: "import" | "manual" | "api";
  opt_out: boolean;
  created_at: string;           // ISO 8601
}

interface ContactInteraction {
  contact_id: string;
  campaign_id: string;
  event_type: "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "REPLIED" | "OPT_OUT";
  timestamp: string;
}
```

---

## 2. PROPOSED FRONTEND PAGES

### 2.1 Contact List Page (`/contacts`)

**Purpose**: View, search, filter, and manage all contacts

**Features to Implement**:
- [ ] Table/grid view with sorting
- [ ] Search by name/email
- [ ] Filter by: tags, opt_out status, source
- [ ] Sort by: date, name, email, source
- [ ] Bulk actions: delete, tag, export
- [ ] Pagination (limit/offset)
- [ ] Select all / deselect all
- [ ] Empty state illustration

**Fields Displayed**:
| Field | Sortable | Filterable | Notes |
|-------|----------|------------|-------|
| Name (first + last) | ✅ | ❌ | Combined display |
| Email | ✅ | ❌ | Primary identifier |
| Phone | ❌ | ❌ | Optional field |
| Tags | ❌ | ✅ | Pill-style display |
| Source | ❌ | ✅ | import/manual/api |
| Opt-out | ❌ | ✅ | Red indicator if true |
| Created | ✅ | ❌ | Relative time (e.g., "2 days ago") |

**Actions per Row**:
- [ ] Edit contact (pencil icon)
- [ ] Delete contact (trash icon, confirm dialog)
- [ ] View interactions (eye icon)

**API Calls**:
```
GET /contacts?limit=50&offset=0&tags=customer&opt_out=false
→ Returns: { contacts: Contact[], total: number }
```

---

### 2.2 Add/Edit Contact Page (`/contacts/new`, `/contacts/[id]/edit`)

**Purpose**: Create new or edit existing contact

**Fields**:
| Field | Type | Required | Validation | UI Control |
|-------|------|----------|------------|------------|
| `email` | email | ✅ | Valid email format (regex) | Text input |
| `phone` | tel | ❌ | Valid phone format (optional) | Text input |
| `first_name` | text | ❌ | Max 50 chars | Text input |
| `last_name` | text | ❌ | Max 50 chars | Text input |
| `tags` | multi-select | ❌ | Predefined + custom | Tag input with autocomplete |
| `opt_out` | checkbox | ❌ | Toggle opt-out status | Toggle switch |

**Form Validation** (match backend `EMAIL_PATTERN`):
```typescript
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
```

**Logistics**:
- Component: `ContactForm.tsx` (reusable for add/edit)
- API: 
  - New: `POST /contacts` with `{ email, phone?, first_name?, last_name?, tags? }`
  - Edit: `PUT /contacts/{id}` (if endpoint exists) or recreate
- Success: Redirect to `/contacts`
- Error: Display validation messages

**Form Layout (ASCII Mockup)**:
```
┌─────────────────────────────────────────────────┐
│  Add Contact                      [Cancel] [Save] │
├─────────────────────────────────────────────────┤
│                                                 │
│  Email *                                        │
│  ┌─────────────────────────────────────────┐  │
│  │ john.doe@example.com                        │  │
│  └─────────────────────────────────────────┘  │
│  ✅ Valid email format                         │
│                                                 │
│  Phone (optional)                              │
│  ┌─────────────────────────────────────────┐  │
│  │ +1 (234) 567-890                         │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  First Name (optional)                         │
│  ┌─────────────────────────────────────────┐  │
│  │ John                                      │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Last Name (optional)                          │
│  ┌─────────────────────────────────────────┐  │
│  │ Doe                                       │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  Tags                                          │
│  ┌─────────────────────────────────────────┐  │
│  │ customer, newsletter          [Add Tag] │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ☐ Opt out (unsubscribe from campaigns)        │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### 2.3 Contact Detail Page (`/contacts/[id]`)

**Purpose**: View full contact profile and interaction history

**Sections**:

#### 1. Contact Info Card
| Field | Display |
|-------|---------|
| Name | Large heading |
| Email | With copy button |
| Phone | With click-to-call |
| Tags | Pill badges (colored) |
| Source | Badge: import/manual/api |
| Opt-out Status | Green "Active" or Red "Opted Out" |
| Created | Relative time + exact date on hover |
| Actions | [Edit] [Delete] buttons |

#### 2. Interaction History (Timeline)
**Data Source**: `GET /campaigns/contacts/{contact_id}/interactions`

| Field | Display |
|-------|---------|
| Campaign | Campaign name/ID (link to campaign) |
| Event Type | Icon + label (Sent, Opened, Clicked, etc.) |
| Timestamp | Relative time (e.g., "3 hours ago") |

**Event Type Icons**:
| Event | Icon | Color |
|-------|------|-------|
| SENT | 📤 | Blue |
| DELIVERED | ✓ | Green |
| OPENED | 👁 | Purple |
| CLICKED | 🔗 | Orange |
| REPLIED | 💬 | Teal |
| FAILED | ❌ | Red |
| OPT_OUT | 🚶 | Gray |

#### 3. Quality Score
**Data Source**: `GET /api/quality/{contact_id}/score`

Display as:
```
Quality Score: 0.75 (75%)
[████████████████████░░░░░░] 75%
Positive responses: 15
Negative responses: 5
```

#### 4. Tags Management
- [ ] Display all current tags
- [ ] Add new tag (text input + add button)
- [ ] Remove tag (x button on tag pill)
- [ ] Autocomplete from existing tags

**API Calls**:
```
GET /contacts/{contact_id}
→ Returns: Contact

GET /campaigns/contacts/{contact_id}/interactions
→ Returns: ContactInteraction[]

GET /api/quality/{contact_id}/score
→ Returns: { contact_id, response_rate, last_updated }
```

---

### 2.4 Import Contacts Page (`/contacts/import`)

**Purpose**: Bulk import contacts via CSV/JSON

**Features**:
- [ ] File upload zone (drag-and-drop)
- [ ] Support CSV and JSON formats
- [ ] Field mapping UI (drag-and-drop columns)
- [ ] Preview table (first 10 rows)
- [ ] Validation errors display (per-row)
- [ ] Import progress bar
- [ ] Download template button
- [ ] Success summary (imported X, failed Y)

**Expected File Format (CSV)**:
```csv
email,phone,first_name,last_name,tags
john.doe@example.com,+1234567890,John,Doe,"customer,newsletter"
jane.smith@example.com,+1987654321,Jane,Smith,vip
bob.jones@example.com,,,,"prospect"
```

**Expected File Format (JSON)**:
```json
[
  {
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "tags": ["customer", "newsletter"]
  },
  {
    "email": "jane.smith@example.com",
    "phone": "+1987654321",
    "first_name": "Jane",
    "last_name": "Smith",
    "tags": ["vip"]
  }
]
```

**Import Flow (ASCII Mockup)**:
```
Step 1: Upload
┌─────────────────────────────────────────────────┐
│                                                 │
│    ┌─────────────────────────────────────┐    │
│    │  📄 Drop CSV/JSON file here          │    │
│    │     or click to browse               │    │
│    └─────────────────────────────────────┘    │
│                                                 │
│    [Download Template]                         │
└─────────────────────────────────────────────────┘
         ↓

Step 2: Mapping (if CSV)
┌─────────────────────────────────────────────────┐
│  Map your columns to contact fields:            │
│                                                 │
│  CSV Column  → Contact Field                   │
│  ┌──────────┐    ┌──────────────┐             │
│  │ email    │ →  │ ✉️ Email *    │             │
│  └──────────┘    └──────────────┘             │
│  ┌──────────┐    ┌──────────────┐             │
│  │ phone   │ →  │ 📞 Phone     │             │
│  └──────────┘    └──────────────┘             │
│  ...                                             │
└─────────────────────────────────────────────────┘
         ↓

Step 3: Preview
┌─────────────────────────────────────────────────┐
│  Preview (showing 10 of 150 contacts)          │
│                                                 │
│  ⚠️ 2 rows have validation errors              │
│                                                 │
│  ┌───┬─────────────────┬─────────┬────────┐ │
│  │ # │ Email           │ Name    │ Status │ │
│  ├───┼─────────────────┼─────────┼────────┤ │
│  │ 1 │ john@...        │ John D  │ ✅ OK   │ │
│  │ 2 │ invalid-email   │ Jane S  │ ❌ Error│ │
│  └───┴─────────────────┴─────────┴────────┘ │
│                                                 │
│  [Back] [Import 150 Contacts]                   │
└─────────────────────────────────────────────────┘
         ↓

Step 4: Progress
┌─────────────────────────────────────────────────┐
│  Importing contacts...                          │
│  [████████████████████░░░░░░] 75%              │
│                                                 │
│  120 imported, 5 failed                        │
└─────────────────────────────────────────────────┘
         ↓

Step 5: Complete
┌─────────────────────────────────────────────────┐
│  ✅ Import Complete!                           │
│                                                 │
│  Successfully imported: 145 contacts            │
│  Failed: 5 contacts                         │
│                                                 │
│  [View Failed Rows] [Go to Contacts]           │
└─────────────────────────────────────────────────┘
```

**API Call**:
```
POST /contacts/import
Body: { contacts: Partial<Contact>[] }
Response: { imported: number, failed: number, errors: string[] }
```

---

## 3. COMPONENTS TO CREATE

### 3.1 `components/contacts/ContactList.tsx`
**Purpose**: Paginated, sortable, filterable table of contacts

**Props**:
```typescript
interface ContactListProps {
  contacts: Contact[];
  total: number;
  limit: number;
  offset: number;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onView: (contactId: string) => void;
}
```

**Features**:
- Table with sortable column headers
- Row selection checkboxes
- Bulk action toolbar (appears when rows selected)
- Pagination controls

---

### 3.2 `components/contacts/ContactCard.tsx`
**Purpose**: Grid view card for contacts (alternative to table)

**Props**:
```typescript
interface ContactCardProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
}
```

**Display**:
- Avatar (initials or default icon)
- Name
- Email
- Tags (max 3 visible, +N more)
- Quick actions

---

### 3.3 `components/contacts/ContactForm.tsx`
**Purpose**: Reusable form for add/edit

**Props**:
```typescript
interface ContactFormProps {
  contact?: Contact;  // If editing, pre-populate
  onSubmit: (data: Partial<Contact>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Controlled inputs
- Real-time validation
- Tag input with autocomplete
- Error message display

---

### 3.4 `components/contacts/ContactDetail.tsx`
**Purpose**: Full contact profile display

**Props**:
```typescript
interface ContactDetailProps {
  contact: Contact;
  interactions: ContactInteraction[];
  qualityScore: { response_rate: number; last_updated: string };
}
```

**Features**:
- Contact info card
- Interaction timeline
- Quality score gauge
- Tag management

---

### 3.5 `components/contacts/ImportWizard.tsx`
**Purpose**: Multi-step import process

**Props**:
```typescript
interface ImportWizardProps {
  onComplete: (result: { imported: number; failed: number }) => void;
  onCancel: () => void;
}
```

**Steps**:
1. Upload file
2. Map fields (if CSV)
3. Preview & validate
4. Confirm import
5. Show results

---

### 3.6 `components/contacts/TagManager.tsx`
**Purpose**: Tag creation and management

**Props**:
```typescript
interface TagManagerProps {
  tags: string[];
  allTags: string[];  // For autocomplete
  onChange: (tags: string[]) => void;
}
```

**Features**:
- Add new tag
- Remove tag
- Autocomplete from existing tags
- Color coding (optional)

---

### 3.7 `components/contacts/InteractionTimeline.tsx`
**Purpose**: Timeline view of contact interactions

**Props**:
```typescript
interface InteractionTimelineProps {
  interactions: ContactInteraction[];
}
```

**Display**:
- Chronological timeline
- Event type icons
- Campaign links
- Relative timestamps

---

## 4. API CLIENT (`lib/api/contacts.ts`)

```typescript
// apps/frontend/src/lib/api/contacts.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Contact {
  contact_id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  source: "import" | "manual" | "api";
  opt_out: boolean;
  created_at: string;
}

export interface ContactInteraction {
  contact_id: string;
  campaign_id: string;
  event_type: "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "REPLIED" | "OPT_OUT";
  timestamp: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export interface QualityScore {
  contact_id: string;
  response_rate: number;
  last_updated: string;
}

// List contacts with filtering
export async function getContacts(params?: {
  limit?: number;
  offset?: number;
  tags?: string;
  opt_out?: boolean;
  source?: string;
}): Promise<{ contacts: Contact[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", params.limit.toString());
  if (params?.offset) query.set("offset", params.offset.toString());
  if (params?.tags) query.set("tags", params.tags);
  if (params?.opt_out !== undefined) query.set("opt_out", params.opt_out.toString());
  if (params?.source) query.set("source", params.source);

  const response = await fetch(`${API_BASE}/contacts?${query.toString()}`);
  if (!response.ok) throw new Error("Failed to fetch contacts");
  return response.json();
}

// Get single contact
export async function getContact(contactId: string): Promise<Contact> {
  const response = await fetch(`${API_BASE}/contacts/${contactId}`);
  if (!response.ok) throw new Error("Failed to fetch contact");
  return response.json();
}

// Create single contact
export async function createContact(contact: Partial<Contact>): Promise<Contact> {
  const response = await fetch(`${API_BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contact),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to create contact");
  }
  return response.json();
}

// Delete contact
export async function deleteContact(contactId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/contacts/${contactId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete contact");
}

// Bulk import contacts
export async function importContacts(contacts: Partial<Contact>[]): Promise<ImportResult> {
  const response = await fetch(`${API_BASE}/contacts/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contacts }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to import contacts");
  }
  return response.json();
}

// Get contact interactions
export async function getContactInteractions(contactId: string): Promise<ContactInteraction[]> {
  const response = await fetch(`${API_BASE}/campaigns/contacts/${contactId}/interactions`);
  if (!response.ok) throw new Error("Failed to fetch interactions");
  return response.json();
}

// Get contact quality score
export async function getContactQualityScore(contactId: string): Promise<QualityScore> {
  const response = await fetch(`${API_BASE}/api/quality/${contactId}/score`);
  if (!response.ok) throw new Error("Failed to fetch quality score");
  return response.json();
}

// Track contact response (for quality scoring)
export async function trackContactResponse(
  contactId: string,
  responseType: "positive" | "negative" | "neutral",
  source: "email" | "sms"
): Promise<{ tracked: boolean }> {
  const response = await fetch(`${API_BASE}/api/quality/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_id: contactId,
      response_type: responseType,
      source,
    }),
  });
  if (!response.ok) throw new Error("Failed to track response");
  return response.json();
}
```

---

## 5. TYPE DEFINITIONS (`lib/contracts/contact.ts`)

```typescript
// apps/frontend/src/lib/contracts/contact.ts

export interface Contact {
  contact_id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  tags: string[];
  source: "import" | "manual" | "api";
  opt_out: boolean;
  created_at: string;
}

export interface ContactInteraction {
  contact_id: string;
  campaign_id: string;
  event_type: "SENT" | "DELIVERED" | "FAILED" | "OPENED" | "CLICKED" | "REPLIED" | "OPT_OUT";
  timestamp: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export interface QualityScore {
  contact_id: string;
  response_rate: number;
  last_updated: string;
}

export interface ContactFormData {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  tags?: string[];
  opt_out?: boolean;
}
```

---

## 6. NAVIGATION UPDATES

### Update `lib/home-navigation.ts`

Add contact management card to home page:

```typescript
// apps/frontend/src/lib/home-navigation.ts

export const routeCards: RouteCard[] = [
  // ... existing cards
  {
    title: "Contact Management",
    description: "Manage your contact lists, import leads, and track interactions",
    href: "/contacts",
    icon: "👥",
    phase: 9,
    status: "pending" // Change to "complete" when done
  },
];
```

---

## 7. DATABASE CONSIDERATIONS

### Current (JSON Storage)
- **File**: `apps/backend/data/contacts.json`
- **Format**: `Contact[]`
- **Limitations**: 
  - No indexing (full scan for filters)
  - Slow search on large datasets (1000+ contacts)
  - No transactional integrity

### Future (PostgreSQL Migration)
When migrating to PostgreSQL:

```sql
-- Contacts table
CREATE TABLE contacts (
  contact_id VARCHAR(20) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  tags TEXT[],  -- PostgreSQL array type
  source VARCHAR(20) DEFAULT 'manual',
  opt_out BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_opt_out ON contacts(opt_out);
CREATE INDEX idx_contacts_source ON contacts(source);

-- Contact interactions table
CREATE TABLE contact_interactions (
  id SERIAL PRIMARY KEY,
  contact_id VARCHAR(20) REFERENCES contacts(contact_id),
  campaign_id VARCHAR(20),
  event_type VARCHAR(20),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_contact ON contact_interactions(contact_id);
CREATE INDEX idx_interactions_campaign ON contact_interactions(campaign_id);
```

---

## 8. TESTING PLAN

### Frontend Tests (`apps/frontend/src/__tests__/`)

| Test File | Purpose |
|-----------|---------|
| `contact-list.test.tsx` | List rendering, sorting, filtering, pagination |
| `contact-form.test.tsx` | Form validation, submission, error handling |
| `import-wizard.test.tsx` | File upload, field mapping, import progress |

**Example Test**:
```typescript
// contact-list.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { ContactList } from "../components/contacts/ContactList";

describe("ContactList", () => {
  it("renders contacts in table", () => {
    const contacts = [
      { contact_id: "CNT-001", email: "john@example.com", first_name: "John" },
      { contact_id: "CNT-002", email: "jane@example.com", first_name: "Jane" },
    ];
    
    render(<ContactList contacts={contacts} total={2} limit={10} offset={0} />);
    
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("filters by tag", () => {
    // Test filtering logic
  });
});
```

### Backend Tests (`apps/backend/tests/`)

| Test File | Purpose |
|-----------|---------|
| `test_contacts_api.py` | All CRUD operations |
| `test_contacts_import.py` | Bulk import scenarios |
| `test_contacts_service.py` | Service layer logic |

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Foundation
- [ ] Create `apps/frontend/src/app/contacts/` directory
- [ ] Create `apps/frontend/src/lib/api/contacts.ts` API client
- [ ] Define TypeScript interfaces in `apps/frontend/src/lib/contracts/contact.ts`
- [ ] Read `docs/obsidian/SKILL.md` for coding standards

### Phase 2: List View
- [ ] Build `ContactList.tsx` component
- [ ] Create `/contacts` page
- [ ] Implement search bar
- [ ] Implement filtering (tags, opt_out, source)
- [ ] Add pagination
- [ ] Add sorting (name, email, date)
- [ ] Style with CSS (follow existing patterns)

### Phase 3: Add/Edit Contact
- [ ] Build `ContactForm.tsx` component
- [ ] Create `/contacts/new` page
- [ ] Create `/contacts/[id]/edit` page
- [ ] Implement form validation
- [ ] Handle API errors
- [ ] Add success/error toasts

### Phase 4: Detail View
- [ ] Build `ContactDetail.tsx` component
- [ ] Create `/contacts/[id]` page
- [ ] Integrate interaction history timeline
- [ ] Add quality score display
- [ ] Implement tag management

### Phase 5: Import Contacts
- [ ] Build `ImportWizard.tsx` component
- [ ] Create `/contacts/import` page
- [ ] Implement file upload (drag-and-drop)
- [ ] Add CSV/JSON parsing
- [ ] Create field mapping UI
- [ ] Add preview and validation
- [ ] Show import progress and results

### Phase 6: Polish & Testing
- [ ] Add tag management UI
- [ ] Implement bulk actions (delete, tag)
- [ ] Add keyboard shortcuts
- [ ] Write frontend tests
- [ ] Write backend tests (if missing)
- [ ] Update documentation
- [ ] Update `docs/HANDOFF.md` with contacts progress

---

## 10. MOCKUPS (ASCII)

### Contact List Page
```
┌─────────────────────────────────────────────────────────────┐
│  Contacts                         [+ Add Contact] [Import]   │
├─────────────────────────────────────────────────────────────┤
│  🔍 Search by name or email...                           │
│  [Filters ▼]  Showing: All Contacts ▼                       │
├──────┬──────────────────┬──────────┬────────┬────────────┤
│ ☑    │ Name             │ Email    │ Tags   │ Actions     │
├──────┼──────────────────┼──────────┼────────┼────────────┤
│ ☐    │ John Doe         │ john@e.. │ cust.. │ ✏️ 🗑️ 👁     │
│ ☐    │ Jane Smith       │ jane@e.. │ vip    │ ✏️ 🗑️ 👁     │
│ ☐    │ Bob Jones        │ bob@e.. │        │ ✏️ 🗑️ 👁     │
├──────┴──────────────────┴──────────┴────────┴────────────┤
│  [Delete Selected] [Tag Selected]                            │
│  ← 1 2 3 ... 10 →    Showing 1-20 of 150             │
└─────────────────────────────────────────────────────────────┘
```

### Contact Detail Page
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Contacts                                    │
├─────────────────────────────────────────────────────────────┤
│  Contact Details                    [Edit] [Delete]         │
│  ┌───────────────────────────────────────────────────┐   │
│  │ John Doe                                      │   │
│  │ 📧 john.doe@example.com           [Copy]         │   │
│  │ 📞 +1 (234) 567-890                                     │   │
│  │ Tags: [customer] [newsletter] [+ Add Tag]           │   │
│  │ Source: import                   Status: ✅ Active     │   │
│  │ Created: 3 days ago (2026-04-25)                     │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Interaction History                                       │
│  ┌───────────────────────────────────────────────────┐   │
│  │ 📤 Sent     Campaign: Summer Sale    2 hrs ago   │   │
│  │ ✓ Delivered  Campaign: Summer Sale    2 hrs ago   │   │
│  │ 👁 Opened    Campaign: Summer Sale    1 hr ago    │   │
│  │ 🔗 Clicked   Campaign: Summer Sale    1 hr ago    │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Quality Score                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │ 75% [████████████████████░░░░░░] 0.75         │   │
│  │ Positive: 15    Negative: 5                        │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. FILES TO CREATE/MODIFY

### New Files to Create
```
apps/frontend/src/
├── app/contacts/
│   ├── page.tsx              (list view)
│   ├── new/page.tsx           (add contact)
│   ├── [id]/
│   │   ├── page.tsx          (detail view)
│   │   └── edit/page.tsx    (edit contact)
│   └── import/page.tsx        (import contacts)
│
├── components/contacts/
│   ├── ContactList.tsx
│   ├── ContactCard.tsx
│   ├── ContactForm.tsx
│   ├── ContactDetail.tsx
│   ├── ImportWizard.tsx
│   ├── TagManager.tsx
│   └── InteractionTimeline.tsx
│
├── lib/api/contacts.ts
└── lib/contracts/contact.ts

apps/frontend/src/__tests__/
├── contact-list.test.tsx
├── contact-form.test.tsx
└── import-wizard.test.tsx
```

### Files to Modify
```
apps/frontend/src/
├── lib/home-navigation.ts        (add contacts card)
├── app/page.tsx                 (update if needed)
└── ... (any other navigation components)

docs/
├── HANDOFF.md                   (update with contacts progress)
└── obsidian/SKILL.md           (add contacts to project scope)
```

---

## 12. NEXT STEPS FOR DEVELOPER

1. **Read Documentation**
   - [ ] `docs/HANDOFF.md` (full project overview)
   - [ ] `docs/obsidian/SKILL.md` (coding standards)
   - [ ] `docs/TECHNICAL_DOCUMENTATION.md` (technical reference)

2. **Set Up Environment**
   - [ ] Clone repo: `git clone https://github.com/Zerefzeolite/Marketing_Engine.git`
   - [ ] Install backend deps: `cd apps/backend && pip install -r requirements.txt`
   - [ ] Install frontend deps: `cd apps/frontend && npm install`
   - [ ] Configure `.env` files

3. **Start Implementation**
   - [ ] Begin with Phase 1 (Foundation)
   - [ ] Follow Phase 2-6 checklist
   - [ ] Commit frequently with clear messages
   - [ ] Run tests before each commit

4. **Update Documentation**
   - [ ] Update `docs/HANDOFF.md` as features complete
   - [ ] Update `docs/obsidian/SKILL.md` if scope changes
   - [ ] Add new API endpoints to `docs/obsidian/151 - API Endpoints.md`

---

## 13. REVISION HISTORY

| Date | Version | Changes |
|------|---------|---------|
| 2026-04-28 | 1.0 | Initial revised planning document |
| 2026-04-28 | 1.1 | Added ASCII mockups, detailed API client, full checklist |

---

**Ready for next developer to begin implementation.**
**Contact Management is the next major feature after handoff.**
