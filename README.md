# CourtHub 🏸🎾⚽🏀

> A production-quality multi-vendor sports court booking platform — built as a full-stack portfolio project.

[![CI](https://github.com/YOUR_USERNAME/courthub/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/courthub/actions/workflows/ci.yml)

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│              Next.js Frontend (App Router)              │
│        Zod · TanStack Query · Axios · TypeScript        │
└──────────────────────┬─────────────────────────────────┘
                       │ REST API
┌──────────────────────▼─────────────────────────────────┐
│              NestJS Backend (Node.js)                   │
│   JWT Auth · Prisma ORM · class-validator · Swagger     │
└────────┬─────────────┬──────────────┬───────────────────┘
         │             │              │
  ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
  │ PostgreSQL  │ │  Redis   │ │  AWS S3    │
  │  (Prisma)   │ │ Phase 2  │ │  (images)  │
  └─────────────┘ └──────────┘ └────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Backend | NestJS (Node.js, TypeScript) |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT (access + refresh tokens), Passport.js |
| Validation | class-validator (backend), Zod (frontend) |
| Containerization | Docker + Docker Compose |
| Cloud | AWS (ECS Fargate, RDS, S3, CDK) |
| CI/CD | GitHub Actions |
| Testing | Jest (unit + e2e) |
| API Docs | Swagger / OpenAPI |

## User Roles

| Role | Description |
|---|---|
| `ADMIN` | Manages all users, venues, bookings. Views platform analytics. |
| `VENUE_OWNER` | Registers venues and courts. Sets pricing and availability. |
| `CUSTOMER` | Searches courts, books slots, manages own bookings. |

## ⭐ Key Design Decision — Concurrency-Safe Booking

Two customers cannot book the same court for the same time slot. This is enforced with **two layers**:

1. **Application layer:** Prisma `$transaction` with `SELECT ... FOR UPDATE` row-level lock
2. **Database layer:** `@@unique([courtId, date, startTime])` constraint on the `Booking` table

If two requests race through simultaneously, the DB unique constraint rejects the second insert with a 409 Conflict response.

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/courthub.git
cd courthub

# 2. Set up environment
cp .env.example .env
# Edit .env with your SMTP credentials (use Mailtrap for dev)

# 3. Start everything
docker compose up --build

# App will be available at:
# Frontend:  http://localhost:3000
# Backend:   http://localhost:3001
# API Docs:  http://localhost:3001/api/docs
```

## Local Development (without Docker)

### Prerequisites
- Node.js 20+
- PostgreSQL 16
- npm

### Backend
```bash
cd backend
npm install
cp ../.env.example .env   # fill in DATABASE_URL etc.
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend
```bash
cd frontend
npm install
cp ../.env.example .env.local
npm run dev
```

## Demo Credentials (after running seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@courthub.com | Admin1234! |
| Venue Owner | owner1@courthub.com | Owner1234! |
| Customer | customer@courthub.com | Customer1234! |

## API Documentation

Swagger UI: `http://localhost:3001/api/docs`

## Project Structure

```
courthub/
├── backend/          # NestJS API
├── frontend/         # Next.js App
├── infrastructure/   # AWS CDK stacks
├── .github/          # GitHub Actions workflows
├── docker-compose.yml
└── .env.example
```

## Running Tests

```bash
# Backend unit tests
cd backend && npm run test

# Backend e2e tests
cd backend && npm run test:e2e

# Frontend type check
cd frontend && npx tsc --noEmit
```

## Planned (Phase 2)

- [ ] Redis caching for search results & availability
- [ ] Real-time slot updates via WebSocket (Socket.io)
- [ ] Ratings & reviews system
- [ ] Venue owner analytics dashboard
- [ ] Favorite courts for customers
- [ ] Full AWS deployment (ECS Fargate + RDS)
- [ ] CI/CD via GitHub Actions
