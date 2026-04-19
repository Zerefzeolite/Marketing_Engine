# Phase 16: Campaign Execution - Design

## Overview
Execute scheduled campaigns - run the actual message dispatch for queued campaigns.

## Goals
1. Poll and execute due campaigns
2. Connect to dispatch service
3. Record execution results
4. Handle errors gracefully

## Scope

### In Scope
- Scheduler polling loop
- Campaign execution hook to dispatch
- Execution result recording
- Error handling and retries

### Out of Scope
- Real-time push via webhooks
-Distributed execution
- Complex retry policies

## Data Flow

```
Scheduler polls → Find due campaigns → Execute (call dispatch) → Record results
```

## Implementation

### Scheduler Polling
- Simple interval-based polling (every 60s)
- Check for campaigns where scheduled_at <= now
- Mark as executing before starting
- Call dispatch service

### Execution Pipeline
1. Load campaign contacts
2. For each contact: send message
3. Track success/failure counts
4. Record execution log

## API Changes
- `POST /api/campaigns/{id}/execute` - Manual trigger
- `GET /api/executions/{id}` - Execution details

## Acceptance Criteria
- [x] Scheduled campaigns are executed automatically
- [x] Execution results recorded
- [x] Errors handled gracefully
- [x] Manual trigger available