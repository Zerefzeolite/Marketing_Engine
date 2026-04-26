# AI Marketing Engine

End-to-end marketing campaign management system with intake, recommendations, moderation, payments, and analytics.

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: Next.js 16 (React)
- **Storage**: JSON file-based (development), PostgreSQL-ready
- **Email**: Brevo (Sendinblue)
- **SMS**: Twilio

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- npm or yarn

### Backend Setup

```bash
cd apps/backend
pip install -r requirements.txt
cp .env.example .env  # Configure API keys
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd apps/frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Project Structure

```
Marketing_Engine/
├── apps/
│   ├── backend/           # FastAPI backend
│   │   ├── api/           # API route handlers
│   │   ├── models/        # Pydantic models
│   │   ├── services/      # Business logic
│   │   ├── data/          # JSON storage
│   │   └── tests/         # Pytest tests
│   └── frontend/          # Next.js frontend
│       ├── src/
│       │   ├── app/       # Pages
│       │   ├── components/# React components
│       │   └── lib/       # API clients & utils
│       └── __tests__/     # Vitest tests
├── docs/                  # Documentation
└── scripts/               # Utility scripts
```

## Application Flow

```
Intake → Consent → Campaign Setup → Moderation → Payment → Execute → Analytics
```

### 1. Intake
- User submits campaign requirements
- System generates package recommendation
- User selects package tier

### 2. Consent
- Record marketing consent
- Accept terms and conditions

### 3. Campaign Setup
- Select template tier (Basic/Enhanced/Premium)
- Configure campaign details

### 4. Moderation
- Automated AI moderation check
- 3 failed attempts → manual review option
- Manual approval via `/admin/reviews`

### 5. Payment
- Select payment method
- Upload receipt
- Admin verification

### 6. Execute
- Campaign dispatch
- Email/SMS sending via providers

### 7. Analytics
- Track delivery events
- Monitor campaign metrics

## API Endpoints

### Campaign Flow
- `POST /campaigns/session/start` - Start campaign session
- `POST /campaigns/moderation/check` - Run moderation
- `POST /campaigns/moderation/manual-review/decision` - Manual review
- `POST /campaigns/execute` - Execute campaign

### Intake
- `POST /intake/submit` - Submit intake
- `POST /intake/recommend` - Get recommendation

### Payment
- `POST /payments/submit` - Submit payment
- `POST /payments/verify` - Verify (admin)
- `GET /payments/pending` - List pending

### Analytics
- `POST /campaigns/{id}/events` - Record event
- `GET /campaigns/{id}/metrics` - Get metrics

## Configuration

### Environment Variables (Backend)

```env
# API Keys
BREVO_API_KEY=your_brevo_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1xxxxx

# Optional
DATABASE_URL=postgresql://...  # Future: PostgreSQL
```

### Environment Variables (Frontend)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEBUG=true
```

## Testing

```bash
# Backend
cd apps/backend
pytest

# Frontend
cd apps/frontend
npm test
```

## Package Tiers

| Tier | Sends | Markup | Use Case |
|------|-------|--------|----------|
| Starter | 2 | 1.5x | Sample/testing |
| Growth | 4 | 2.0x | Standard campaigns |
| Premium | 4 | 2.5x | High-value campaigns |

## Development

### Adding New Features

1. Create feature branch
2. Add backend API in `apps/backend/app/api/`
3. Add business logic in `apps/backend/app/services/`
4. Add frontend page in `apps/frontend/src/app/`
5. Add components in `apps/frontend/src/components/`
6. Write tests
7. Update documentation

### Code Standards

- Backend: Python with Pydantic models, type hints required
- Frontend: TypeScript, React hooks, functional components
- API: RESTful, JSON responses, proper HTTP status codes

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License

Private - Internal Use Only