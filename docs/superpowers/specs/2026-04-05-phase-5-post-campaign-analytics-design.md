# Phase 5: Post-Campaign Analytics Design

**Date**: 2026-04-05
**Status**: Approved

## Overview

Phase 5 adds post-campaign analytics with delivery metrics, interaction tracking (opens, clicks, replies, opt-outs), and consent-aware reporting. This completes the optimization loop for the marketing engine.

## Scope

### In Scope
- Analytics service with tracking endpoints
- Delivery metrics (sent, delivered, failed)
- Interaction metrics (opens, clicks, replies, opt-outs)
- Consent/opt-out tracking per contact per campaign
- Report service enhancement
- JSON-based storage (stub implementation)

### Out of Scope
- Real provider integration (email/SMS providers)
- Scheduled periodic metrics collection
- Advanced insights/ML recommendations (Phase 5 basic only)

---

## Architecture

### Components

1. **Analytics Service** (`app/services/analytics_service.py`)
   - Record delivery events
   - Record interaction events
   - Record consent/opt-out events
   - Query aggregated metrics

2. **Storage** (`data/campaign_metrics.json`)
   - Per-campaign metrics storage
   - Per-contact interaction log (privacy-aware)

3. **API Endpoints** (in `app/api/analytics.py`)
   - `POST /campaigns/{id}/events` - Record delivery/interaction events
   - `GET /campaigns/{id}/metrics` - Get campaign metrics
   - `POST /contacts/{id}/consent` - Record consent preference change

4. **Report Enhancement** (`app/services/report_service.py`)
   - Include consent/opt-out stats in reports
   - Include per-contact interaction summary

---

## Data Model

### Campaign Metrics Schema

```json
{
  "campaign_id": "CMP-123",
  "delivery": {
    "sent": 150,
    "delivered": 145,
    "failed": 5
  },
  "interactions": {
    "opens": 89,
    "clicks": 34,
    "replies": 12,
    "opt_outs": 3
  },
  "consent_events": [
    {
      "contact_id": "CNT-001",
      "campaign_id": "CMP-123",
      "event_type": "OPT_OUT",
      "timestamp": "2026-04-05T10:30:00Z"
    }
  ],
  "updated_at": "2026-04-05T12:00:00Z"
}
```

### Contact Interaction Log

```json
{
  "contact_id": "CNT-001",
  "campaign_interactions": [
    {
      "campaign_id": "CMP-123",
      "delivered": true,
      "opened": true,
      "clicked": true,
      "replied": false,
      "opted_out": false,
      "first_open_at": "2026-04-05T09:15:00Z",
      "last_click_at": "2026-04-05T09:20:00Z"
    }
  ]
}
```

---

## API Contracts

### Record Event Request

```python
class CampaignEventRequest(BaseModel):
    campaign_id: str
    contact_id: str
    event_type: Literal["SENT", "DELIVERED", "FAILED", "OPENED", "CLICKED", "REPLIED", "OPT_OUT"]
    timestamp: datetime
```

### Metrics Response

```python
class CampaignMetricsResponse(BaseModel):
    campaign_id: str
    delivery: dict[str, int]
    interactions: dict[str, int]
    consent_summary: dict[str, int]
    dispatch_ready: bool
```

### Consent Request

```python
class ConsentEventRequest(BaseModel):
    contact_id: str
    campaign_id: str
    consent_status: Literal["OPT_IN", "OPT_OUT"]
    source: Literal["DIRECT", "CAMPAIGN_INTERACTION"]
```

---

## Interactions Flow

1. Campaign dispatch triggers `SENT` events for each contact
2. Provider webhook (stub) triggers `DELIVERED`/`FAILED`
3. Contact opens email → `OPENED` event
4. Contact clicks link → `CLICKED` event
5. Contact replies → `REPLIED` event
6. Contact clicks opt-out → `OPT_OUT` event (records in consent_events)

---

## Privacy Considerations

- Contact-level interaction data stored separately from aggregate metrics
- Opt-out events are recorded but not used for future campaign targeting
- All timestamps in UTC
- No PII exposed in API responses (only aggregate counts by default)

---

## Testing Strategy

1. Unit tests for analytics service methods
2. Integration tests for API endpoints
3. Verify metrics aggregation correctness
4. Verify consent event recording

---

## Implementation Order

1. Analytics service + storage
2. API endpoints
3. Report service enhancement
4. Frontend integration (metrics display)
5. Tests and verification
