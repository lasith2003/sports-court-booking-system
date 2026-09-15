/**
 * src/bookings/bookings.service.spec.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 9 — Unit Tests: BookingsService
 *
 * Coverage:
 *  ✅ create() — happy path (new booking)
 *  ✅ create() — conflict detection (same slot already booked)
 *  ✅ create() — Prisma P2002 unique violation → 409 ConflictException
 *  ✅ create() — slot outside court opening hours → 400 BadRequestException
 *  ✅ create() — duration not exactly 1 hour → 400 BadRequestException
 *  ✅ create() — court not found → 404 NotFoundException
 *  ✅ cancel()  — customer can cancel own booking
 *  ✅ cancel()  — admin can cancel any booking
 *  ✅ cancel()  — other user cannot cancel → 403 ForbiddenException
 *  ✅ cancel()  — already cancelled → 400 BadRequestException
 *  ✅ confirm() — venue owner can confirm pending booking
 *  ✅ confirm() — wrong owner → 403 ForbiddenException
 *  ✅ confirm() — non-pending booking → 400 BadRequestException
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { BookingStatus, PaymentStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ── Shared test fixtures ───────────────────────────────────────────────────

const COURT_ID = 'court-uuid-001';
const CUSTOMER_ID = 'customer-uuid-001';
const OWNER_ID = 'owner-uuid-001';
const BOOKING_ID = 'booking-uuid-001';
const VENUE_ID = 'venue-uuid-001';

/** A fake Court row returned by $queryRaw SELECT FOR UPDATE */
const mockCourtRow = {
  id: COURT_ID,
  pricePerHour: '1500',
  openingTime: '06:00',
  closingTime: '22:00',
  venueId: VENUE_ID,
};

/** A fully-formed Booking object returned after creation */
const mockCreatedBooking = {
  id: BOOKING_ID,
  customerId: CUSTOMER_ID,
  courtId: COURT_ID,
  date: new Date('2026-10-01T00:00:00.000Z'),
  startTime: '09:00',
  endTime: '10:00',
  status: BookingStatus.PENDING,
  totalPrice: new Decimal('1500'),
  createdAt: new Date(),
  updatedAt: new Date(),
  court: {
    id: COURT_ID,
    name: 'Badminton Court A',
    sportType: 'BADMINTON',
    venue: { id: VENUE_ID, name: 'Colombo Sports Plex', city: 'Colombo' },
  },
};

/** A full Booking row with payment for cancel tests */
const mockBookingWithPayment = {
  ...mockCreatedBooking,
  status: BookingStatus.CONFIRMED,
  customerId: CUSTOMER_ID,
  payment: { id: 'pay-001', bookingId: BOOKING_ID, status: PaymentStatus.PAID },
  court: {
    ...mockCreatedBooking.court,
    venue: { ownerId: OWNER_ID, name: 'Colombo Sports Plex' },
  },
};

// ── Mock factory helpers ───────────────────────────────────────────────────

/**
 * Creates a minimal Prisma mock whose $transaction method immediately calls
 * the provided callback with the `tx` proxy (same mock). Override individual
 * methods on the returned object as needed per test.
 */
function makePrismaMock(overrides: Record<string, any> = {}) {
  const mock: any = {
    booking: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(mockCreatedBooking),
      update: jest.fn().mockResolvedValue({ ...mockCreatedBooking, status: BookingStatus.CANCELLED }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    payment: {
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        email: 'customer@test.lk',
        name: 'Test Customer',
      }),
    },
    court: {
      findUnique: jest.fn().mockResolvedValue({
        name: 'Badminton Court A',
        venue: { name: 'Colombo Sports Plex' },
      }),
    },
    venue: {
      findUnique: jest.fn().mockResolvedValue({ id: VENUE_ID, ownerId: OWNER_ID }),
    },
    $queryRaw: jest.fn().mockResolvedValue([mockCourtRow]),
    $transaction: jest.fn().mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      // Pass the same mock as `tx` so inner tx.booking.* calls are captured
      return callback(mock);
    }),
    ...overrides,
  };
  return mock;
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: any;

  const mockNotifications = {
    sendBookingConfirmed: jest.fn(),
    sendBookingCancelled: jest.fn(),
  };

  async function buildService(prismaMock = makePrismaMock()) {
    prisma = prismaMock;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();
    service = module.get<BookingsService>(BookingsService);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await buildService();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // create() tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const validDto = {
      courtId: COURT_ID,
      date: '2026-10-01',
      startTime: '09:00',
      endTime: '10:00',
    };

    it('should create a booking and payment for a valid slot', async () => {
      const result = await service.create(validDto, CUSTOMER_ID);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.booking.create).toHaveBeenCalledTimes(1);
      expect(prisma.payment.create).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        courtId: COURT_ID,
        status: BookingStatus.PENDING,
      });
    });

    it('should throw 404 NotFoundException if court does not exist', async () => {
      // $queryRaw returns empty array → court not found
      await buildService(
        makePrismaMock({ $queryRaw: jest.fn().mockResolvedValue([]) }),
      );

      await expect(service.create(validDto, CUSTOMER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 400 BadRequestException if slot is outside opening hours', async () => {
      const earlyDto = { ...validDto, startTime: '04:00', endTime: '05:00' };
      await expect(service.create(earlyDto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw 400 BadRequestException if duration is not exactly 1 hour', async () => {
      const twoHourDto = { ...validDto, endTime: '11:00' }; // 09:00 → 11:00 = 2h
      await expect(service.create(twoHourDto, CUSTOMER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    // ⭐ Core concurrency / conflict tests ──────────────────────────────────

    it('should throw 409 ConflictException if the slot is already booked (application-level check)', async () => {
      // Simulate an existing non-cancelled booking for the same slot
      const conflictingBooking = { id: 'existing-booking', status: BookingStatus.CONFIRMED };

      await buildService(
        makePrismaMock({
          $queryRaw: jest.fn().mockResolvedValue([mockCourtRow]),
          booking: {
            findFirst: jest.fn().mockResolvedValue(conflictingBooking), // conflict found!
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(service.create(validDto, CUSTOMER_ID)).rejects.toThrow(
        ConflictException,
      );

      // Booking.create must NOT be called after a conflict is detected
      expect(prisma.booking.create).not.toHaveBeenCalled();
    });

    it('should throw 409 ConflictException when Prisma P2002 unique violation occurs (DB-level safety net)', async () => {
      // Simulate the race condition where two requests slip through the
      // application check and the DB unique constraint fires on the second INSERT
      const p2002Error = { code: 'P2002', message: 'Unique constraint failed' };

      await buildService(
        makePrismaMock({
          $queryRaw: jest.fn().mockResolvedValue([mockCourtRow]),
          $transaction: jest.fn().mockRejectedValue(p2002Error),
        }),
      );

      await expect(service.create(validDto, CUSTOMER_ID)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should propagate non-P2002 errors as-is', async () => {
      const internalError = new Error('DB connection failed');

      await buildService(
        makePrismaMock({
          $transaction: jest.fn().mockRejectedValue(internalError),
        }),
      );

      await expect(service.create(validDto, CUSTOMER_ID)).rejects.toThrow(
        'DB connection failed',
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // cancel() tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    const futureBooking = {
      ...mockBookingWithPayment,
      // 1 day in the future — well within the cancellation window
      date: new Date(Date.now() + 48 * 60 * 60 * 1000),
      startTime: '15:00',
      status: BookingStatus.CONFIRMED,
    };

    it('should allow a customer to cancel their own booking', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(futureBooking),
            update: jest.fn().mockResolvedValue({ ...futureBooking, status: BookingStatus.CANCELLED }),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      const result = await service.cancel(BOOKING_ID, CUSTOMER_ID, Role.CUSTOMER);
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should allow an ADMIN to cancel any booking', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(futureBooking),
            update: jest.fn().mockResolvedValue({ ...futureBooking, status: BookingStatus.CANCELLED }),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      const result = await service.cancel(BOOKING_ID, 'admin-uuid', Role.ADMIN);
      expect(result.status).toBe(BookingStatus.CANCELLED);
    });

    it('should throw 403 ForbiddenException if a different customer tries to cancel', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(futureBooking),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(
        service.cancel(BOOKING_ID, 'other-customer-uuid', Role.CUSTOMER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 400 BadRequestException if booking is already cancelled', async () => {
      const alreadyCancelledBooking = {
        ...futureBooking,
        status: BookingStatus.CANCELLED,
      };

      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(alreadyCancelledBooking),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(
        service.cancel(BOOKING_ID, CUSTOMER_ID, Role.CUSTOMER),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 404 NotFoundException if booking does not exist', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(
        service.cancel(BOOKING_ID, CUSTOMER_ID, Role.CUSTOMER),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // confirm() tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('confirm()', () => {
    const pendingBookingWithVenue = {
      ...mockCreatedBooking,
      status: BookingStatus.PENDING,
      court: {
        ...mockCreatedBooking.court,
        venue: { ownerId: OWNER_ID, name: 'Colombo Sports Plex' },
      },
    };

    it('should allow the venue owner to confirm a pending booking', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(pendingBookingWithVenue),
            update: jest.fn().mockResolvedValue({
              ...pendingBookingWithVenue,
              status: BookingStatus.CONFIRMED,
            }),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      const result = await service.confirm(BOOKING_ID, OWNER_ID);
      expect(result.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should throw 403 ForbiddenException if a different owner tries to confirm', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(pendingBookingWithVenue),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(
        service.confirm(BOOKING_ID, 'wrong-owner-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 400 BadRequestException if booking is not PENDING', async () => {
      const confirmedBooking = {
        ...pendingBookingWithVenue,
        status: BookingStatus.CONFIRMED,
      };

      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(confirmedBooking),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(service.confirm(BOOKING_ID, OWNER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw 404 NotFoundException if booking does not exist', async () => {
      await buildService(
        makePrismaMock({
          booking: {
            findUnique: jest.fn().mockResolvedValue(null),
            update: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
          },
        }),
      );

      await expect(service.confirm(BOOKING_ID, OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
