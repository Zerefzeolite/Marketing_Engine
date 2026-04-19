# Phase 15: Quality Gate Improvements - Design

## Overview
Improve the Quality Gate page with better UI, filtering, and actionable insights.

## Current State
- Basic DomainScorecard components
- Shows total findings, critical open, closed counts
- No filtering or sorting
- Title says "Phase 6" (outdated)

## Goals
1. Fix outdated title
2. Add status indicators (pass/warning/fail)
3. Add filtering (by domain, status)
4. Add sorting capabilities
5. Improve visual presentation

## Scope

### In Scope
- UI improvements to existing components
- Client-side filtering
- Status badges/chips
- Better spacing and typography

### Out of Scope
- Server-side filtering (use existing API)
- Export functionality
- Bulk actions

## Acceptance Criteria
- [x] Title updated to "Quality Gate"
- [x] Status indicators show pass/warning/fail
- [x] Filter by domain
- [x] Filter by status
- [x] Sort by domain/critical count
- [x] Improved visual presentation