# Phase 14: Campaign Scheduling & Execution - Design

## Overview
Add campaign scheduling capabilities so campaigns can be queued and executed at specified times.

## Goals
1. Schedule campaigns for future execution
2. Execute scheduled campaigns automatically
3. Track execution status and history

## Scope

### In Scope
- Schedule metadata on campaigns (run_at, timezone)
- Execution queue storage
- Simple cron-like scheduler (polling-based for MVP)
- Execution history logging

### Out of Scope
- Real-time cron daemon
- Multi-threaded scheduler
- Complex recurrence rules
- External webhook triggers

## Data Model

### Extended Campaign
```json
{
  "campaign_id": "CMP-001",
  "status": "scheduled",
  "scheduled_at": "2026-04-20T14:00:00Z",
  "timezone": "America/New_York",
  "executed_at": null,
  "execution_status": "pending"
}
```

### Execution Log
```json
{
  "execution_id": "EXEC-001",
  "campaign_id": "CMP-001",
  "started_at": "2026-04-20T14:00:00Z",
  "completed_at": "2026-04-20T14:05:00Z",
  "status": "completed",
  "contacts_attempted": 500,
  "contacts_delivered": 470,
  "errors": []
}
```

## API Changes

### New Endpoints
- `PATCH /api/campaigns/{id}/schedule` - Schedule campaign
- `GET /api/campaigns/scheduled` - List scheduled campaigns
- `GET /api/executions` - List execution history

### Updated Campaign Model
- Add `scheduled_at`: ISO datetime
- Add `timezone`: IANA timezone
- Add `status`: draft | scheduled | executing | completed | failed

## Implementation Approach
1. Add scheduling fields to campaign model
2. Add scheduler service with polling
3. Add execution log storage
4. Add API endpoints

## Acceptance Criteria
- [x] Campaigns can be scheduled for future times
- [x] Scheduled campaigns appear in queue
- [x] Scheduler picks up due campaigns
- [x] Execution results are logged
- [x] API returns scheduled/execution data