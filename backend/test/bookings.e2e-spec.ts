/**
 * test/bookings.e2e-spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 9 — E2E Tests: Booking Flow
 *
 * These tests spin up the full NestJS app (with a real test database) and
 * exercise complete HTTP request flows using supertest.
 *
 * Scenarios:
 *  ✅ POST /api/v1/auth/register  — register a new customer
 *  ✅ POST /api/v1/auth/login     — login and get JWT access token
 *  ✅ GET  /api/v1/courts         — list available courts
 *  ✅ POST /api/v1/bookings       — book a court slot (Happy Path)
 *  ✅ POST /api/v1/bookings       — same slot again → 409 Conflict (Double-booking)
 *  ✅ GET  /api/v1/bookings/me    — customer can see their bookings
 *  ✅ POST /api/v1/payments/:id/confirm — mock payment confirm → PAID + CONFIRMED
 *
 * Prerequisites (before running e2e tests):
 *   • A running PostgreSQL instance with DATABASE_URL set in .env.test
 *   • Run: npx prisma migrate dev (schema must be in sync)
 *   • The test uses a shared DB; each run cleans up its own created records.
 *
 * Run command:
 *   npm run test:e2e
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Generates a unique email so parallel test runs don't collide */
const uniqueEmail = () => `e2e_test_${Date.now()}@sportcourt.lk`;

// ── Test suite ─────────────────────────────────────────────────────────────

describe('Booking Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Shared state across tests in this suite
  let customerEmail: string;
  let accessToken: string;
  let courtId: string;
  let bookingId: string;
  let paymentId: string;

  // ── App bootstrap ──────────────────────────────────────────────────────

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same global pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    customerEmail = uniqueEmail();
  });

  afterAll(async () => {
    // ── Cleanup: remove test-created records ─────────────────────────────
    // Delete in FK-safe order
    if (bookingId) {
      await prisma.payment.deleteMany({ where: { bookingId } });
      await prisma.booking.deleteMany({ where: { id: bookingId } });
    }
    await prisma.user.deleteMany({ where: { email: customerEmail } });
    await app.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Register
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register a new customer and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'E2E Test Customer',
          email: customerEmail,
          password: 'Test@12345',
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user.email).toBe(customerEmail);
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('should return 409 if the same email registers again', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Customer',
          email: customerEmail,
          password: 'Test@12345',
        })
        .expect(409);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Login
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login and return a valid JWT access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: 'Test@12345' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(typeof res.body.accessToken).toBe('string');
      accessToken = res.body.accessToken; // save for subsequent requests
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: customerEmail, password: 'WrongPassword!' })
        .expect(401);
    });

    it('should return 401 for non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@nowhere.lk', password: 'Any@12345' })
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Get available courts
  // ─────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/courts', () => {
    it('should return a list of courts (seeded data expected)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/courts')
        .expect(200);

      const courts = Array.isArray(res.body) ? res.body : res.body.data;
      expect(Array.isArray(courts)).toBe(true);
      expect(courts.length).toBeGreaterThan(0);

      // Save the first court ID for booking tests
      courtId = courts[0].id;
      expect(courtId).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Book a court — Happy Path ⭐
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/bookings — Happy Path', () => {
    it('should create a booking for an available slot', async () => {
      // Use a date well in the future to avoid real slot conflicts with seed data
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const bookingDateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courtId,
          date: bookingDateStr,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.courtId).toBe(courtId);
      expect(res.body.status).toBe('PENDING');
      expect(res.body).toHaveProperty('court');

      bookingId = res.body.id; // save for cancel/confirm and cleanup
    });

    it('should return 401 if no auth token is provided', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 35);
      const dateStr = futureDate.toISOString().split('T')[0];

      await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send({
          courtId,
          date: dateStr,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Double-booking — the core concurrency protection test ⭐
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/bookings — Double-booking prevention', () => {
    it('should return 409 Conflict when the same slot is booked again', async () => {
      // We know bookingId is set from the previous test, meaning the slot is taken
      // Retrieve the booking to get its date and time
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      expect(booking).not.toBeNull();

      const dateStr = booking!.date.toISOString().split('T')[0];

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courtId: booking!.courtId,
          date: dateStr,
          startTime: booking!.startTime,
          endTime: booking!.endTime,
        })
        .expect(409);

      expect(res.body.message).toMatch(/already booked|just booked/i);
    });

    it('should allow booking a DIFFERENT slot on the same court (same day)', async () => {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });
      const dateStr = booking!.date.toISOString().split('T')[0];

      // Book 12:00–13:00 instead of 10:00–11:00
      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courtId: booking!.courtId,
          date: dateStr,
          startTime: '12:00',
          endTime: '13:00',
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');

      // Cleanup extra booking
      await prisma.payment.deleteMany({ where: { bookingId: res.body.id } });
      await prisma.booking.deleteMany({ where: { id: res.body.id } });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. GET /bookings/me — Customer sees their bookings
  // ─────────────────────────────────────────────────────────────────────────

  describe("GET /api/v1/bookings/me — Customer's own bookings", () => {
    it('should return the customer\'s own bookings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const myBooking = res.body.find((b: { id: string }) => b.id === bookingId);
      expect(myBooking).toBeDefined();
      expect(myBooking.courtId).toBe(courtId);
    });

    it('should return 401 if no auth token is provided', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bookings/me')
        .expect(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Mock Payment — confirm payment → booking becomes CONFIRMED
  // ─────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/payments/:bookingId/confirm — Mock payment', () => {
    it('should confirm payment and update booking to CONFIRMED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/payments/${bookingId}/confirm`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('payment');
      expect(res.body).toHaveProperty('booking');
      expect(res.body.payment.status).toBe('PAID');
      expect(res.body.booking.status).toBe('CONFIRMED');
    });
  });
});
