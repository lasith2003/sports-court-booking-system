# Sports Court Booking System — Implementation Plan

## Project Overview

**CourtHub** — A multi-vendor sports court booking platform built as a portfolio/CV project. Venue owners list their courts; customers search and book time slots online. The key technical highlight is a **concurrency-safe booking engine** that prevents double-bookings using PostgreSQL transactions + unique constraints.

This plan follows the exact milestone order defined in the spec (Section 14), organized into clear phases. Each phase must be **verified before moving to the next**.

---

## Architecture Summary

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│              Next.js (App Router, TypeScript)            │
│         Zod validation · TanStack Query · Axios          │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼───────────────────────────────┐
│                        BACKEND                           │
│             NestJS (Node.js, TypeScript)                 │
│  Passport.js JWT · class-validator · @nestjs/swagger     │
└─────────┬────────────────┬────────────────┬──────────────┘
          │                │                │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼──────┐
   │ PostgreSQL  │  │   Redis     │  │   AWS S3   │
   │  (via ORM)  │  │ (Phase 2)   │  │  (images)  │
   │   Prisma    │  └─────────────┘  └────────────┘
   └─────────────┘
```

---

## Open Questions

> [!IMPORTANT]
> These are clarified by spec defaults. No blockers. Decisions documented below:

| Decision Point | Chosen Approach | Reason |
|---|---|---|
| Booking confirmation | **Auto-confirm** on payment (no manual venue owner approval needed for MVP) | Spec says this is optional — auto-confirm simplifies MVP |
| Slot duration | **1-hour fixed slots** | Spec says "hourly slots" — simplest and most common |
| Image storage (local dev) | **Local disk fallback** | Spec explicitly allows this |
| Pagination style | **limit/offset** | Spec explicitly says to pick limit/offset |
| Refresh token storage | **Hashed in DB** on `User.refreshToken` field | Matches schema, cleaner than a separate blacklist table |

---

## Phase 0 — Repository & Monorepo Setup

**Goal:** Create a clean, well-structured monorepo before writing any feature code.

### Files to create

#### [NEW] `README.md` (project root)
- Project name, description, architecture diagram (ASCII/Mermaid)
- Setup instructions placeholder (filled in at the end)
- Tech stack badges

#### [NEW] `docker-compose.yml` (project root)
- Services: `postgres`, `backend`, `frontend`
- `redis` service stubbed but commented out (Phase 2)
- Volume for postgres data persistence
- `.env` file referenced for secrets

#### [NEW] `.env.example` (project root)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/courthub
JWT_SECRET=changeme
JWT_REFRESH_SECRET=changeme
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=courthub-images
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
```

#### [NEW] `.gitignore` (project root)
- `node_modules`, `.env`, `dist`, `.next`, `coverage`

---

## Phase 1 — Backend Foundation

**Milestone 1 from spec:** NestJS project setup, Prisma schema + migration, global config.

### 1.1 NestJS Project Bootstrap

**Command:** `npx @nestjs/cli new backend --package-manager npm --skip-git`

#### [NEW] `backend/src/main.ts`
- Bootstrap NestJS app
- Enable CORS (allow only `FRONTEND_URL`)
- Apply `helmet()` middleware for security headers
- Apply `ValidationPipe` globally (whitelist + transform)
- Apply `HttpExceptionFilter` globally
- Apply `TransformInterceptor` globally (consistent response shape)
- Set global prefix `/api/v1`
- Mount Swagger at `/api/docs`
- Rate limiting via `@nestjs/throttler` on auth routes

#### [NEW] `backend/src/config/`
- `configuration.ts` — typed config factory reading from `process.env`
- `env.validation.ts` — Joi or Zod schema validating all required env vars at startup (fail fast if missing)

#### [NEW] `backend/src/common/`
- `filters/http-exception.filter.ts` — global error shape: `{ statusCode, message, error, timestamp, path }`
- `interceptors/transform.interceptor.ts` — wraps all success responses: `{ data, message, statusCode }`
- `interceptors/logging.interceptor.ts` — logs every request/response
- `decorators/roles.decorator.ts` — `@Roles(...roles: Role[])`
- `decorators/current-user.decorator.ts` — `@CurrentUser()` extracts user from JWT payload
- `guards/jwt-auth.guard.ts` — extends `AuthGuard('jwt')`
- `guards/roles.guard.ts` — checks `@Roles()` metadata against `req.user.role`

### 1.2 Prisma Setup

#### [NEW] `backend/prisma/schema.prisma`
Exact schema from spec Section 6:
- Enums: `Role`, `BookingStatus`, `PaymentStatus`, `SportType`
- Models: `User`, `Venue`, `Court`, `Booking`, `Payment`, `Review`
- Key constraint: `@@unique([courtId, date, startTime])` on `Booking`
- Indexes: `@@index([sportType])` on `Court`, `@@index([customerId])` on `Booking`

#### [NEW] `backend/prisma/migrations/`
- Generated via `npx prisma migrate dev --name init`

#### [NEW] `backend/src/prisma/prisma.module.ts` + `prisma.service.ts`
- `PrismaService` extends `PrismaClient`, implements `OnModuleInit`/`OnModuleDestroy`
- Exported as global module so all feature modules can inject it

### 1.3 Backend Dockerfile

#### [NEW] `backend/Dockerfile`
```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
CMD ["node", "dist/main"]
```

---

## Phase 2 — Auth Module

**Milestone 2:** Register, login, JWT strategy, refresh tokens, RBAC.

### Module: `backend/src/auth/`

#### [NEW] `auth.module.ts`
- Imports `PassportModule`, `JwtModule` (with access token config)
- Registers `JwtStrategy`, `JwtRefreshStrategy`

#### [NEW] `auth.controller.ts`
```
POST /api/v1/auth/register   → AuthService.register()
POST /api/v1/auth/login      → AuthService.login()
POST /api/v1/auth/refresh    → AuthService.refreshTokens() [uses JwtRefreshStrategy]
POST /api/v1/auth/logout     → AuthService.logout()        [requires JwtAuthGuard]
```

#### [NEW] `auth.service.ts`
- `register`: hash password with `bcrypt` (cost 12), create user, return tokens
- `login`: verify credentials, generate access + refresh tokens, store **hashed** refresh token in `User.refreshToken`
- `refreshTokens`: validate hashed refresh token, rotate both tokens
- `logout`: set `User.refreshToken = null`

#### [NEW] `strategies/jwt.strategy.ts`
- Validates `Authorization: Bearer <access_token>`
- Returns `{ id, email, role }` as `req.user`

#### [NEW] `strategies/jwt-refresh.strategy.ts`
- Validates `Authorization: Bearer <refresh_token>` on the refresh endpoint
- Fetches user, compares hashed refresh token

#### [NEW] `dto/register.dto.ts`, `login.dto.ts`, `auth-response.dto.ts`
- `class-validator` decorators on all fields
- `@ApiProperty()` on all fields for Swagger

### Module: `backend/src/users/`

#### [NEW] `users.controller.ts`
```
GET   /api/v1/users/me         → [JwtAuthGuard]         UsersService.getMe()
GET   /api/v1/users            → [JwtAuthGuard, ADMIN]  UsersService.findAll()
PATCH /api/v1/users/:id/role   → [JwtAuthGuard, ADMIN]  UsersService.updateRole()
```

#### [NEW] `users.service.ts`
- `findById`, `findByEmail`, `findAll`, `updateRole`
- **Never return password in any response** — use serialization or manual omit

---

## Phase 3 — Venues & Courts Modules

**Milestone 3:** Full CRUD with ownership checks.

### Module: `backend/src/venues/`

#### [NEW] `venues.controller.ts`
```
POST   /api/v1/venues         → [JwtAuthGuard, VENUE_OWNER]        VenuesService.create()
GET    /api/v1/venues         → [public]                           VenuesService.findAll()
GET    /api/v1/venues/:id     → [public]                           VenuesService.findOne()
PATCH  /api/v1/venues/:id     → [JwtAuthGuard, VENUE_OWNER]        VenuesService.update()  ← ownership check
DELETE /api/v1/venues/:id     → [JwtAuthGuard, VENUE_OWNER|ADMIN]  VenuesService.remove()  ← ownership check
```

#### [NEW] `venues.service.ts`
- `create`: attach `ownerId` from JWT payload
- `update`/`remove`: throw `ForbiddenException` if `venue.ownerId !== currentUser.id` (unless ADMIN)
- Image upload: `POST /venues/:id/image` — accept multipart, save to S3 (or local disk in dev)

#### [NEW] `dto/create-venue.dto.ts`, `update-venue.dto.ts`

### Module: `backend/src/courts/`

#### [NEW] `courts.controller.ts`
```
POST   /api/v1/venues/:venueId/courts  → [JwtAuthGuard, VENUE_OWNER]  CourtsService.create()
GET    /api/v1/courts                  → [public + filters]            CourtsService.findAll()
GET    /api/v1/courts/:id              → [public]                      CourtsService.findOne()
GET    /api/v1/courts/:id/availability → [public, ?date=YYYY-MM-DD]    CourtsService.getAvailability()
PATCH  /api/v1/courts/:id             → [JwtAuthGuard, VENUE_OWNER]   CourtsService.update()
DELETE /api/v1/courts/:id             → [JwtAuthGuard, VENUE_OWNER|ADMIN] CourtsService.remove()
```

#### [NEW] `courts.service.ts`

**`getAvailability(courtId, date)` algorithm:**
```
1. Parse court.openingTime and court.closingTime into hours
2. Generate all 1-hour slots: ["06:00", "07:00", ..., "21:00"]
3. Fetch all bookings for this courtId + date where status != CANCELLED
4. Filter out slots that overlap with existing bookings
5. Return array of { startTime, endTime, isAvailable } objects
```

**`findAll(filters)` — search with:**
- `sportType` filter
- `city` filter (via `venue.city`)
- `date` filter (exclude courts with no availability on that date)
- `minPrice`/`maxPrice` filter on `pricePerHour`
- `page`/`limit` for pagination

#### [NEW] `dto/create-court.dto.ts`, `update-court.dto.ts`, `court-availability.dto.ts`

---

## Phase 4 — Bookings Module ⭐ (Most Critical)

**Milestone 4:** Concurrency-safe booking creation, cancel/confirm flows.

### Module: `backend/src/bookings/`

#### [NEW] `bookings.controller.ts`
```
POST   /api/v1/bookings                    → [JwtAuthGuard, CUSTOMER]           BookingsService.create()
GET    /api/v1/bookings/me                 → [JwtAuthGuard, CUSTOMER]           BookingsService.findMine()
GET    /api/v1/bookings/venue/:venueId     → [JwtAuthGuard, VENUE_OWNER]        BookingsService.findByVenue()
PATCH  /api/v1/bookings/:id/cancel         → [JwtAuthGuard, CUSTOMER|ADMIN]     BookingsService.cancel()
PATCH  /api/v1/bookings/:id/confirm        → [JwtAuthGuard, VENUE_OWNER]        BookingsService.confirm()
GET    /api/v1/bookings                    → [JwtAuthGuard, ADMIN]              BookingsService.findAll()
```

#### [NEW] `bookings.service.ts`

**`create()` — Concurrency-Safe Booking (KEY FEATURE):**
```typescript
async create(dto: CreateBookingDto, customerId: string) {
  return this.prisma.$transaction(async (tx) => {
    // 1. Fetch court with a row-level lock (SELECT FOR UPDATE)
    const court = await tx.$queryRaw`
      SELECT * FROM "Court" WHERE id = ${dto.courtId} FOR UPDATE
    `;

    // 2. Validate slot is within court opening hours
    // 3. Calculate totalPrice = pricePerHour * duration

    // 4. Check for conflicting bookings (belt-and-suspenders before DB constraint)
    const conflict = await tx.booking.findFirst({
      where: {
        courtId: dto.courtId,
        date: dto.date,
        startTime: dto.startTime,
        status: { not: 'CANCELLED' },
      },
    });
    if (conflict) throw new ConflictException('Slot already booked');

    // 5. Create Booking (status: PENDING)
    const booking = await tx.booking.create({ data: { ...dto, customerId, totalPrice } });

    // 6. Create Payment record (status: PENDING)
    await tx.payment.create({ data: { bookingId: booking.id, amount: totalPrice } });

    return booking;
    // DB unique constraint @@unique([courtId, date, startTime]) catches any race 
    // that slips through the application-level check → returns 409 Conflict
  });
}
```

> [!IMPORTANT]
> The `@@unique([courtId, date, startTime])` Prisma constraint is the **final safety net**. Even if two requests pass the application-level check simultaneously, the DB will reject the second insert with a unique violation. This two-layer approach (lock + constraint) is the correct production pattern.

**`cancel()` logic:**
- Booking must belong to customer (or be ADMIN)
- Status must not be `COMPLETED`
- Ideally: booking date/startTime must be > 1 hour from now
- Set status → `CANCELLED`, Payment status → `REFUNDED`

**`confirm()` logic:**
- Venue owner must own the court's venue
- Status must be `PENDING`
- Set status → `CONFIRMED`

---

## Phase 5 — Payments Module

**Milestone 5:** Mock payment flow.

### Module: `backend/src/payments/`

#### [NEW] `payments.controller.ts`
```
POST /api/v1/payments/:bookingId/confirm → [JwtAuthGuard, CUSTOMER]
```

#### [NEW] `payments.service.ts`
- `confirm(bookingId, userId)`:
  1. Fetch Payment, verify booking belongs to user
  2. Set `Payment.status = PAID`
  3. Set `Booking.status = CONFIRMED`
  4. Trigger email notification (async, non-blocking)
  5. Return updated booking

---

## Phase 6 — Notifications

**Milestone 6:** Email via Nodemailer.

#### [NEW] `backend/src/notifications/notifications.module.ts` + `notifications.service.ts`
- Nodemailer transport configured from SMTP env vars
- `sendBookingConfirmation(user, booking, court)` — async, wrapped in try/catch
- `sendBookingCancellation(user, booking, court)` — async, wrapped in try/catch
- **Never throw** — log error and continue if email fails

---

## Phase 7 — Swagger Documentation

**Milestone 7:** All endpoints decorated.

- Every controller: `@ApiTags()`
- Every endpoint: `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`
- Every DTO: `@ApiProperty()`
- Swagger UI available at `GET /api/docs`
- JSON available at `GET /api/docs-json`

---

## Phase 8 — Seed Script

**Milestone 8:** Demo data for recruiters.

#### [NEW] `backend/prisma/seed.ts`
Creates:
- 1 Admin user (`admin@courthub.com` / `Admin1234!`)
- 2 Venue Owners with 1 venue each
- 3 Courts per venue (different sport types)
- 5-10 sample bookings in various statuses

Run via: `npx ts-node prisma/seed.ts`

---

## Phase 9 — Backend Tests

**Milestone 9:** Unit tests + e2e happy-path.

#### [NEW] `backend/src/bookings/bookings.service.spec.ts`
- **Unit test: double-booking prevention**
  - Mock Prisma transaction
  - Simulate two concurrent `create()` calls for same slot
  - Assert second call throws `ConflictException`
- **Unit test: cancellation cutoff**

#### [NEW] `backend/test/app.e2e-spec.ts`
- **E2E happy path:** Register → Login → Search Courts → Create Booking → Confirm Payment
- **E2E double-booking:** Create booking → attempt same slot → assert 409

---

## Phase 10 — Frontend (Next.js)

**Milestone 10:** Full customer flow + role-specific dashboards.

### 10.1 Project Bootstrap
`npx create-next-app@latest frontend --typescript --app --eslint --src-dir=false`

### 10.2 Core Setup

#### [NEW] `frontend/lib/api.ts`
- Axios instance with base URL from env
- Request interceptor: attach `Authorization: Bearer <token>` from localStorage/cookie
- Response interceptor: on 401, attempt token refresh, retry original request

#### [NEW] `frontend/lib/auth.ts`
- `getAccessToken()`, `setTokens()`, `clearTokens()`
- `useAuth()` hook wrapping JWT state

#### [NEW] `frontend/lib/validators/` (Zod schemas)
- `registerSchema`, `loginSchema`, `createVenueSchema`, `createCourtSchema`, `createBookingSchema`

### 10.3 Pages & Components

| Route | Component | Description |
|---|---|---|
| `/` | `LandingPage` | Hero, feature highlights, CTA to search |
| `/(auth)/login` | `LoginPage` | Email/password form, Zod validation |
| `/(auth)/register` | `RegisterPage` | Name, email, password, role select (Customer/Venue Owner) |
| `/(customer)/search` | `SearchPage` | Filters sidebar, court cards grid, pagination |
| `/(customer)/courts/[id]` | `CourtDetailPage` | Court info, date picker, slot selector |
| `/(customer)/bookings` | `MyBookingsPage` | List of user bookings, cancel button |
| `/(customer)/checkout` | `CheckoutPage` | Booking summary, mock payment button |
| `/(venue-owner)/dashboard` | `VenueOwnerDashboard` | Quick stats, recent bookings |
| `/(venue-owner)/venues` | `VenuesListPage` | List of owner's venues, create/edit/delete |
| `/(venue-owner)/venues/new` | `CreateVenuePage` | Form to create venue |
| `/(venue-owner)/courts` | `CourtsListPage` | List courts, manage pricing/hours |
| `/(admin)/admin/dashboard` | `AdminDashboard` | Platform stats, user/venue/booking tables |

#### Key shared components:
- `components/ui/Button`, `Input`, `Card`, `Badge`, `Modal`, `Spinner`
- `components/layout/Navbar` — role-aware nav links, logout button
- `components/courts/CourtCard` — court thumbnail, price, sport type badge
- `components/courts/SlotPicker` — time slot grid, shows available/booked slots
- `components/bookings/BookingCard` — booking status badge, cancel button

### 10.4 Auth Guard
- Each route group has a `layout.tsx` that checks role from JWT
- Redirect to `/login` if unauthenticated
- Redirect to appropriate dashboard if wrong role

---

## Phase 11 — Docker & docker-compose

**Milestone 11:** `docker compose up` should start everything.

#### [MODIFY] `docker-compose.yml`
```yaml
version: '3.9'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: courthub
      POSTGRES_USER: courthub
      POSTGRES_PASSWORD: courthub
    volumes:
      - pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on: [postgres]
    environment:
      DATABASE_URL: postgresql://courthub:courthub@postgres:5432/courthub
    ports:
      - "3001:3001"
    command: sh -c "npx prisma migrate deploy && node dist/main"

  frontend:
    build: ./frontend
    depends_on: [backend]
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001/api/v1
    ports:
      - "3000:3000"

  # redis:           # Phase 2
  #   image: redis:7-alpine

volumes:
  pg_data:
```

#### Multi-stage Dockerfiles for both `backend/` and `frontend/`

---

## Phase 12 — AWS CDK Infrastructure

**Milestone 12:** IaC for cloud deployment.

### CDK Project: `infrastructure/`

#### Stacks (TypeScript):

| Stack | Resources |
|---|---|
| `NetworkStack` | VPC, public + private subnets, Security Groups, NAT Gateway |
| `DatabaseStack` | RDS PostgreSQL (Multi-AZ for prod), Secret in Secrets Manager |
| `StorageStack` | S3 bucket for images, CloudFront distribution (optional) |
| `EcsStack` | ECS Cluster, Fargate task definitions for backend + frontend, ALB, Target Groups, ECR repos |
| `MonitoringStack` | CloudWatch Log Groups, CPU/memory alarms, dashboard |

---

## Phase 13 — GitHub Actions CI/CD

**Milestone 13:** Two workflows.

#### [NEW] `.github/workflows/ci.yml`
Triggers: `push` + `pull_request` on any branch
- `install`: `npm ci` for backend and frontend
- `lint`: `npm run lint`
- `test`: `npm run test` (unit) + `npm run test:e2e`
- `build`: `docker build` (no push)

#### [NEW] `.github/workflows/cd.yml`
Triggers: `push` to `main`
- Build and push Docker images to ECR
- Run `cdk deploy --all` in `infrastructure/`
- Notify on success/failure

---

## Phase 14 — README & Documentation

**Milestone 14:** Professional README.

#### [MODIFY] `README.md`
- Architecture diagram (Mermaid)
- Quick start (docker compose up)
- Environment variable reference
- API documentation link (`/api/docs`)
- Tech stack with rationale
- Key design decisions (concurrency, RBAC, token rotation)
- Screenshots of UI
- "Planned / Phase 2" section for Redis, WebSockets, real payments

---

## Verification Plan

### Per-Phase Verification

| Phase | Verification Method |
|---|---|
| 1 — Foundation | `npm run build` passes; Prisma migration runs cleanly |
| 2 — Auth | Postman/curl: register, login, get tokens, refresh, logout |
| 3 — Venues/Courts | CRUD via Swagger UI (`/api/docs`); ownership check returns 403 |
| 4 — Bookings | **Unit test** proves double-booking throws 409; Postman confirms booking flow |
| 5 — Payments | Mock confirm endpoint transitions booking to CONFIRMED |
| 6 — Notifications | Check Mailtrap inbox for booking confirmation email |
| 7 — Swagger | All endpoints visible at `/api/docs` with correct request/response shapes |
| 8 — Seed | `npx prisma db seed` populates DB; demo login works |
| 9 — Tests | `npm run test` and `npm run test:e2e` all pass |
| 10 — Frontend | Manual walkthrough of all user flows in browser |
| 11 — Docker | `docker compose up` — all services healthy; booking flow works end-to-end |
| 12 — CDK | `cdk synth` succeeds; (optional) `cdk deploy` to AWS |
| 13 — CI/CD | Push a PR; confirm GitHub Actions CI passes |

### Automated Tests
```bash
# Backend unit tests
cd backend && npm run test

# Backend e2e tests
cd backend && npm run test:e2e

# Frontend type check
cd frontend && npx tsc --noEmit
```

---

## Monorepo Structure (Final)

```
Sport_court_booking_system/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   ├── filters/
│   │   │   └── interceptors/
│   │   ├── config/
│   │   ├── prisma/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── venues/
│   │   ├── courts/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── reviews/          (Phase 2)
│   │   └── admin/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/
│   ├── Dockerfile
│   └── .env.example
├── frontend/                   # Next.js App
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (customer)/
│   │   ├── (venue-owner)/
│   │   ├── (admin)/
│   │   └── layout.tsx
│   ├── components/
│   ├── lib/
│   ├── types/
│   ├── Dockerfile
│   └── .env.local.example
├── infrastructure/             # AWS CDK
│   └── lib/
│       ├── network-stack.ts
│       ├── database-stack.ts
│       ├── storage-stack.ts
│       ├── ecs-stack.ts
│       └── monitoring-stack.ts
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Execution Sequence (step-by-step)

1. ✅ `Phase 0` — Repo setup: docker-compose, .gitignore, README skeleton
2. ✅ `Phase 1` — Backend: NestJS bootstrap, Prisma schema, global middleware
3. ✅ `Phase 2` — Auth: JWT, refresh tokens, RBAC guards, Users module
4. ✅ `Phase 3` — Venues + Courts: CRUD, ownership checks, availability algorithm
5. ✅ `Phase 4` — Bookings: **concurrency-safe create**, cancel, confirm
6. ✅ `Phase 5` — Payments: mock confirm, booking → CONFIRMED transition
7. ✅ `Phase 6` — Notifications: Nodemailer, non-blocking
8. ✅ `Phase 7` — Swagger: decorate all endpoints
9. ✅ `Phase 8` — Seed: demo data
10. ✅ `Phase 9` — Tests: booking concurrency unit test, e2e happy path
11. ✅ `Phase 10` — Frontend: all pages and flows
12. ✅ `Phase 11` — Docker: multi-stage Dockerfiles, docker-compose
13. ✅ `Phase 12` — AWS CDK: 4 stacks
14. ✅ `Phase 13` — GitHub Actions: CI + CD
15. ✅ `Phase 14` — README: final polish
