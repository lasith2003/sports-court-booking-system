# CourtHub — Build Task Tracker

## Phase 0 — Repo Setup
- [ ] .gitignore
- [ ] .env.example
- [ ] README.md skeleton
- [ ] docker-compose.yml (stub)

## Phase 1 — Backend Foundation
- [ ] NestJS project bootstrap
- [ ] Global config + env validation
- [ ] Common (filters, interceptors, guards, decorators)
- [ ] Prisma schema (exact from spec)
- [ ] PrismaModule + PrismaService
- [ ] First migration
- [ ] Backend Dockerfile (multi-stage)

## Phase 2 — Auth Module
- [ ] AuthModule, AuthService, AuthController
- [ ] JWT strategy + Refresh strategy
- [ ] Register / Login / Refresh / Logout endpoints
- [ ] UsersModule, UsersService, UsersController

## Phase 3 — Venues & Courts
- [ ] VenuesModule full CRUD + ownership check
- [ ] CourtsModule full CRUD + ownership check
- [ ] Availability algorithm (dynamic slot computation)
- [ ] Search with filters (sportType, city, price, date)

## Phase 4 — Bookings ⭐
- [ ] BookingsModule
- [ ] Concurrency-safe create (Prisma $transaction + FOR UPDATE + unique constraint)
- [ ] Cancel flow
- [ ] Confirm flow (venue owner)
- [ ] Admin list all bookings

## Phase 5 — Payments
- [ ] PaymentsModule
- [ ] Mock confirm endpoint (PENDING → PAID, booking → CONFIRMED)

## Phase 6 — Notifications
- [ ] NotificationsModule + NotificationsService
- [ ] Booking confirmation email
- [ ] Cancellation email (non-blocking)

## Phase 7 — Swagger
- [ ] Decorate all controllers/DTOs with @ApiTags, @ApiOperation, @ApiResponse

## Phase 8 — Seed Script
- [ ] Admin user
- [ ] 2 Venue Owners + Venues
- [ ] 3 Courts per venue
- [ ] Sample bookings

## Phase 9 — Tests
- [ ] Booking concurrency unit test
- [ ] E2E happy path (register → login → book → payment)
- [ ] E2E double-booking test (assert 409)

## Phase 10 — Frontend (Next.js)
- [ ] Project bootstrap
- [ ] lib/api.ts (axios + interceptors)
- [ ] lib/auth.ts + Zod validators
- [ ] Landing page
- [ ] Auth pages (login, register)
- [ ] Customer: search, court detail, slot picker, checkout, my bookings
- [ ] Venue Owner: dashboard, venue/court management
- [ ] Admin: dashboard with stats

## Phase 11 — Docker
- [ ] backend/Dockerfile (multi-stage)
- [ ] frontend/Dockerfile (multi-stage)
- [ ] docker-compose.yml (final)

## Phase 12 — AWS CDK
- [ ] infrastructure/ project setup
- [ ] NetworkStack
- [ ] DatabaseStack
- [ ] StorageStack
- [ ] EcsStack
- [ ] MonitoringStack

## Phase 13 — GitHub Actions
- [ ] .github/workflows/ci.yml
- [ ] .github/workflows/cd.yml

## Phase 14 — README
- [ ] Architecture diagram
- [ ] Setup instructions
- [ ] API docs link
- [ ] Screenshots
