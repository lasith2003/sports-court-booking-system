# Sports Court Booking System — Full Project Specification

> This document is a complete specification for an AI coding assistant (e.g. Antigravity) to build a production-quality full-stack web application. Follow this spec closely. Ask clarifying questions only if something is truly ambiguous — otherwise make sensible, industry-standard decisions consistent with this document.

---

## 1. Project Overview

**Name:** Sports Court Booking System (working title — can be branded, e.g. "CourtHub")

**Purpose:** A multi-vendor platform where venue owners list sports courts (badminton, tennis, futsal, basketball, etc.) and customers search, view availability, and book time slots online. Built as a portfolio/CV project demonstrating full-stack, cloud, and DevOps skills to a professional standard.

**Target audience for the demo:** Software engineering recruiters / technical interviewers. Code quality, architecture, and correctness matter more than visual polish — but the UI should still look clean and professional.

---

## 2. Tech Stack (fixed — do not substitute)

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router, TypeScript) |
| Backend | NestJS (Node.js, TypeScript) |
| Database | PostgreSQL |
| ORM | Prisma (Prisma Migrate for schema migrations) |
| Cache (Phase 2) | Redis |
| Auth | JWT (access + refresh tokens), Passport.js |
| Validation | class-validator + class-transformer (backend), Zod (frontend forms) |
| Containerization | Docker + Docker Compose |
| Cloud | AWS (ECS Fargate, RDS for Postgres, S3, CloudWatch) |
| Infrastructure as Code | AWS CDK (TypeScript) |
| CI/CD | GitHub Actions |
| Testing | Jest (unit + e2e for backend), React Testing Library (frontend, optional) |
| API Docs | Swagger / OpenAPI (via `@nestjs/swagger`) |

**Do not** introduce alternative frameworks (e.g. Express standalone, TypeORM, Sequelize, MySQL, MongoDB) unless explicitly instructed.

---

## 3. User Roles

| Role | Description |
|---|---|
| `ADMIN` | Platform administrator. Manages all users, venues, and bookings. Views platform-wide analytics. |
| `VENUE_OWNER` | Registers and manages their own venue(s) and courts. Defines pricing and availability. Views bookings for their courts. |
| `CUSTOMER` | Searches courts, books time slots, views/cancels own bookings. |

Role-based access control (RBAC) must be enforced on every protected endpoint using NestJS Guards + a custom `@Roles()` decorator.

---

## 4. Core Features (MVP — build these first, in this order)

### 4.1 Authentication & Authorization
- Register (Customer / Venue Owner signup — Admin created via seed script only)
- Login → returns JWT access token (short-lived, ~15 min) + refresh token (long-lived, ~7 days)
- Refresh token endpoint to rotate access tokens
- Password hashing with bcrypt
- Route protection via Guards; role-based route protection via `@Roles()` decorator + `RolesGuard`
- Logout (invalidate refresh token — store refresh tokens hashed in DB or a token blacklist)

### 4.2 Venue & Court Management (Venue Owner)
- Venue Owner creates a Venue (name, address, city, description, contact info)
- Venue Owner adds Court(s) under a Venue (name, sport type, price per hour, opening/closing hours)
- Update/delete own venues and courts (ownership check required — a venue owner must not be able to edit another owner's venue)
- Upload venue/court images (store in AWS S3 — for local dev, support local disk fallback)

### 4.3 Court Search & Discovery (Customer)
- Public endpoint: search/list courts with filters — sport type, city/location, date, price range
- Pagination (limit/offset or cursor-based — pick limit/offset for simplicity)
- View single court details including available time slots for a selected date

### 4.4 Time Slot & Availability
- Each court has bookable time slots (e.g. hourly slots between opening and closing hours)
- Slots can be generated dynamically (compute available slots from opening hours minus existing bookings) OR pre-generated per day — **use the dynamic computation approach** to avoid data bloat; only persist `Booking` records, and derive slot availability by checking for overlapping bookings on that court/date/time range.

### 4.5 Booking Flow (Customer)
- Customer selects court + date + time slot → creates a booking (status: `PENDING`)
- **Critical requirement — concurrency safety:** two customers must not be able to book the same court for an overlapping time slot. Implement this using a database transaction with a unique constraint or row-level locking (e.g. `SELECT ... FOR UPDATE` inside a Prisma `$transaction`, or a DB unique constraint on `(courtId, date, startTime)`). This is a key feature to highlight — implement it correctly and be ready to explain it.
- Booking status lifecycle: `PENDING → CONFIRMED → COMPLETED` or `PENDING → CANCELLED`
- Customer can cancel their own booking (only if not yet completed, and ideally only before some cutoff time before the slot starts)
- Venue Owner can confirm/reject pending bookings for their courts (optional — can also auto-confirm on creation for simplicity if time is short; document whichever choice is made)

### 4.6 Payments (Mocked)
- On booking creation, create a `Payment` record with status `PENDING`
- Simulate payment confirmation via a `/payments/:id/confirm` endpoint (mock — no real payment gateway needed for MVP; Stripe test mode is a stretch goal, not required)
- Booking only transitions to `CONFIRMED` once payment is `PAID`

### 4.7 Notifications
- Send an email on booking confirmation and cancellation (use Nodemailer with a free SMTP provider like Mailtrap or Gmail SMTP for dev/demo — do not block core flow if email fails, log the error instead)

### 4.8 Admin Dashboard (basic)
- List all users, venues, bookings
- Basic stats: total bookings, total revenue (sum of paid bookings), most booked courts

---

## 5. Stretch Features (Phase 2 — only after MVP is fully working)

- Redis caching for court search results / availability lookups
- Ratings & reviews (Customer reviews a court after a completed booking)
- Real-time slot availability updates via WebSocket (Socket.io) — when a slot is booked, other users viewing that court see it become unavailable live
- Favorite/saved courts for customers
- Venue owner analytics dashboard (revenue over time, booking trends)

---

## 6. Database Schema (Prisma)

Use this as the baseline `schema.prisma` model structure (adjust field types as needed, but keep entities/relations intact):

```prisma
enum Role {
  ADMIN
  VENUE_OWNER
  CUSTOMER
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum SportType {
  BADMINTON
  TENNIS
  FUTSAL
  BASKETBALL
  SQUASH
  CRICKET_NET
}

model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  password      String
  role          Role      @default(CUSTOMER)
  refreshToken  String?
  venues        Venue[]
  bookings      Booking[]
  reviews       Review[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Venue {
  id          String   @id @default(uuid())
  owner       User     @relation(fields: [ownerId], references: [id])
  ownerId     String
  name        String
  address     String
  city        String
  description String?
  imageUrl    String?
  courts      Court[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Court {
  id            String     @id @default(uuid())
  venue         Venue      @relation(fields: [venueId], references: [id])
  venueId       String
  name          String
  sportType     SportType
  pricePerHour  Decimal
  openingTime   String     // e.g. "06:00"
  closingTime   String     // e.g. "22:00"
  imageUrl      String?
  bookings      Booking[]
  reviews       Review[]
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  @@index([sportType])
}

model Booking {
  id          String        @id @default(uuid())
  customer    User          @relation(fields: [customerId], references: [id])
  customerId  String
  court       Court         @relation(fields: [courtId], references: [id])
  courtId     String
  date        DateTime      // booking date (date-only, store as DateTime at midnight)
  startTime   String        // e.g. "14:00"
  endTime     String        // e.g. "15:00"
  status      BookingStatus @default(PENDING)
  totalPrice  Decimal
  payment     Payment?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([courtId, date, startTime]) // prevents double-booking at the DB level
  @@index([customerId])
}

model Payment {
  id         String        @id @default(uuid())
  booking    Booking       @relation(fields: [bookingId], references: [id])
  bookingId  String        @unique
  amount     Decimal
  status     PaymentStatus @default(PENDING)
  method     String?       // e.g. "mock_card"
  createdAt  DateTime      @default(now())
}

model Review {
  id        String   @id @default(uuid())
  customer  User     @relation(fields: [customerId], references: [id])
  customerId String
  court     Court    @relation(fields: [courtId], references: [id])
  courtId   String
  rating    Int      // 1–5
  comment   String?
  createdAt DateTime @default(now())
}
```

Note: The `@@unique([courtId, date, startTime])` constraint is the key mechanism preventing double-booking at the database level — combine it with a Prisma `$transaction` at the application level for a clean, race-condition-safe booking flow.

---

## 7. Backend API Endpoints (NestJS)

Base path: `/api/v1`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Users
- `GET /users/me` (any authenticated user)
- `GET /users` (Admin only)
- `PATCH /users/:id/role` (Admin only)

### Venues
- `POST /venues` (Venue Owner)
- `GET /venues` (public — list, with filters)
- `GET /venues/:id` (public)
- `PATCH /venues/:id` (Venue Owner — must own it)
- `DELETE /venues/:id` (Venue Owner — must own it, or Admin)

### Courts
- `POST /venues/:venueId/courts` (Venue Owner)
- `GET /courts` (public — search with filters: sportType, city, date, minPrice, maxPrice, page, limit)
- `GET /courts/:id` (public)
- `GET /courts/:id/availability?date=YYYY-MM-DD` (public — returns available time slots)
- `PATCH /courts/:id` (Venue Owner — must own it)
- `DELETE /courts/:id` (Venue Owner — must own it, or Admin)

### Bookings
- `POST /bookings` (Customer — the critical concurrency-safe endpoint)
- `GET /bookings/me` (Customer — own bookings)
- `GET /bookings/venue/:venueId` (Venue Owner — bookings for their venue)
- `PATCH /bookings/:id/cancel` (Customer — own booking, or Admin)
- `PATCH /bookings/:id/confirm` (Venue Owner)
- `GET /bookings` (Admin — all bookings)

### Payments
- `POST /payments/:bookingId/confirm` (mock payment confirmation)

### Reviews (Phase 2)
- `POST /courts/:id/reviews`
- `GET /courts/:id/reviews`

### Admin
- `GET /admin/stats` (total bookings, revenue, top courts)

All endpoints must be documented with Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, etc.) and available at `/api/docs`.

---

## 8. Backend Project Structure (NestJS)

```
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/       (@Roles, @CurrentUser)
│   │   ├── guards/           (JwtAuthGuard, RolesGuard)
│   │   ├── filters/          (HttpExceptionFilter)
│   │   ├── interceptors/     (TransformInterceptor, LoggingInterceptor)
│   │   └── pipes/
│   ├── config/                (env validation, config module)
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/        (jwt.strategy.ts, jwt-refresh.strategy.ts)
│   │   └── dto/
│   ├── users/
│   ├── venues/
│   ├── courts/
│   ├── bookings/
│   ├── payments/
│   ├── reviews/
│   └── admin/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/                       (e2e tests)
├── Dockerfile
├── .env.example
└── package.json
```

Each feature module (`venues`, `courts`, `bookings`, etc.) should follow the standard NestJS pattern: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/` folder with request/response DTOs validated via `class-validator`.

---

## 9. Frontend Project Structure (Next.js App Router)

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (customer)/
│   │   ├── search/page.tsx
│   │   ├── courts/[id]/page.tsx
│   │   ├── bookings/page.tsx
│   │   └── checkout/page.tsx
│   ├── (venue-owner)/
│   │   ├── dashboard/page.tsx
│   │   ├── venues/page.tsx
│   │   ├── venues/new/page.tsx
│   │   └── courts/page.tsx
│   ├── (admin)/
│   │   └── admin/dashboard/page.tsx
│   ├── layout.tsx
│   └── page.tsx                (landing page)
├── components/
│   ├── ui/                     (buttons, inputs, cards — shared)
│   ├── courts/
│   ├── bookings/
│   └── layout/                 (navbar, footer)
├── lib/
│   ├── api.ts                  (fetch wrapper / axios instance)
│   ├── auth.ts                 (token storage/refresh logic)
│   └── validators/             (zod schemas)
├── types/                       (shared TS types/interfaces)
├── Dockerfile
├── .env.local.example
└── package.json
```

Route grouping by role (`(customer)`, `(venue-owner)`, `(admin)`) keeps auth-protected layouts clean — each group can have its own `layout.tsx` with a role-guard check.

---

## 10. Non-Functional Requirements

- **Validation:** every incoming request DTO validated with `class-validator`; return clear 400 errors on failure.
- **Error handling:** global exception filter returning consistent JSON error shape (`{ statusCode, message, error, timestamp, path }`).
- **Security:** helmet middleware, CORS configured to allow only the frontend origin, rate limiting on auth endpoints (`@nestjs/throttler`), passwords never returned in API responses (use a serialization interceptor or manual `omit`).
- **Environment config:** all secrets/config via `.env`, validated at startup with a schema (e.g. `class-validator` on a Config class or `zod`). Never commit `.env` — provide `.env.example`.
- **Logging:** structured logging (NestJS built-in Logger is fine); log all errors with stack traces in dev.
- **Testing:** at minimum, unit tests for the booking concurrency logic and auth service; a couple of e2e tests covering register → login → book flow.

---

## 11. Docker

- `docker-compose.yml` at project root spinning up: `postgres`, `backend`, `frontend`, `redis` (Phase 2)
- Backend and frontend each get a multi-stage `Dockerfile` (builder stage + slim production stage)
- Local dev should work with a single `docker compose up`

---

## 12. AWS Deployment (via AWS CDK, TypeScript)

Target architecture:
- **RDS (PostgreSQL)** — managed database, private subnet
- **ECS Fargate** — runs backend and frontend containers
- **Application Load Balancer** — routes traffic to ECS services
- **S3** — venue/court image storage
- **ECR** — Docker image registry
- **CloudWatch** — logs and basic alarms
- **VPC** — public subnets for ALB, private subnets for ECS tasks and RDS

CDK stacks should be split logically, e.g. `NetworkStack`, `DatabaseStack`, `EcsStack`, `StorageStack` — this modularity itself is a good interview talking point.

---

## 13. CI/CD (GitHub Actions)

Two workflows:
1. **`ci.yml`** — on every PR/push: install deps, lint, run unit + e2e tests, build Docker images (no push)
2. **`cd.yml`** — on merge to `main`: build + push Docker images to ECR, deploy to ECS (via `aws-cdk deploy` or `aws ecs update-service`)

---

## 14. Build Order / Milestones (for the AI assistant to follow)

1. **Backend foundation:** NestJS project setup, Prisma schema + first migration, Prisma service, global config/validation setup
2. **Auth module:** register, login, JWT strategy, refresh tokens, RBAC guards/decorators
3. **Venues + Courts modules:** full CRUD, ownership checks
4. **Bookings module:** availability computation, concurrency-safe booking creation, cancel/confirm flows
5. **Payments module (mock)**
6. **Notifications (email)**
7. **Swagger docs** for all endpoints
8. **Seed script** — create sample Admin, Venue Owners, Venues, Courts, and a few bookings for demo purposes
9. **Backend tests** — unit tests for booking concurrency, e2e happy-path test
10. **Frontend:** auth pages → customer search/booking flow → venue owner dashboard → admin dashboard
11. **Dockerize** both apps + docker-compose for local dev
12. **AWS CDK stacks** + manual or scripted deploy
13. **GitHub Actions** CI then CD
14. **README** with architecture diagram, setup instructions, and API doc link

Build and verify each milestone before moving to the next — do not jump ahead to deployment before the core booking flow works correctly and is tested.

---

## 15. Deliverables Checklist

- [ ] Working backend with all MVP endpoints, documented in Swagger
- [ ] Working frontend covering the full customer booking journey end-to-end
- [ ] Venue owner flow: create venue → add court → view bookings
- [ ] Admin flow: view users/venues/bookings + basic stats
- [ ] Double-booking prevented and demonstrably tested (unit or e2e test proving it)
- [ ] Dockerized local dev environment (`docker compose up` just works)
- [ ] Seed data script for demo purposes
- [ ] README with setup instructions, architecture diagram, and screenshots
- [ ] (Stretch) Deployed on AWS via CDK, reachable via a public URL
- [ ] (Stretch) CI/CD pipeline green on GitHub Actions

---

## 16. Notes for the AI Assistant

- Prioritize correctness of the **booking concurrency logic** above all else — this is the single most CV/interview-relevant feature.
- Keep commits small and frequent with clear messages — this project's GitHub history itself will be reviewed by recruiters.
- Prefer clear, idiomatic NestJS and Next.js patterns over clever/unusual code — the goal is to demonstrate solid, explainable engineering fundamentals, not novelty.
- If a stretch feature (Redis, WebSocket, real payment gateway, full AWS deployment) can't be finished in time, leave it clearly marked as "Planned" in the README rather than half-implemented.
