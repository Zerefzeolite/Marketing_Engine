# AI Marketing Engine - Project Overview

## Vision

An end-to-end marketing campaign management platform enabling Jamaican businesses to launch targeted email and SMS campaigns with AI-powered recommendations, automated moderation, and comprehensive analytics.

## Core Features

1. **Campaign Intake** - Guided campaign creation with AI recommendations
2. **Multi-Channel Delivery** - Email (Brevo) and SMS (Twilio) support
3. **Automated Moderation** - AI-powered content safety checks
4. **Manual Review Workflow** - Human oversight for flagged campaigns
5. **Payment Processing** - Local bank transfer with receipt verification
6. **Analytics Dashboard** - Real-time campaign performance tracking

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python FastAPI |
| Frontend | Next.js 16 (React) |
| Email | Brevo (Sendinblue) |
| SMS | Twilio |
| Storage | JSON files (dev), PostgreSQL-ready |
| Testing | Pytest + Vitest |

## Quick Links

- [[API Endpoints]] - Full API reference
- [[Database Schema]] - Data structure documentation
- [[Process Flows]] - Business process diagrams
- [[Coding Standards]] - Development guidelines
- [[Component Inventory]] - Component reference
- [[Configuration]] - Environment setup

## Project Status

**Phase**: 23 (Package Pricing Redesign)  
**Build Status**: ✅ Passing  
**Last Updated**: 2026-04-26

## Active Development

- Admin review portal (`/admin/reviews`)
- Dev-mode quick approve buttons
- Slider-based contact range adjustment