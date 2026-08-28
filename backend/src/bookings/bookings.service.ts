import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════
  // ⭐ CREATE — Concurrency-Safe Booking (The Key Feature)
  // ═══════════════════════════════════════════════════════════════
  /**
   * Creates a booking using a two-layer safety approach:
   *
   * Layer 1 (Application): Prisma $transaction with SELECT FOR UPDATE row-level
   *   lock on the Court row — serialises concurrent requests for the same court.
   *
   * Layer 2 (Database): @@unique([courtId, date, startTime]) constraint on the
   *   Booking table — the final safety net if two requests somehow slip through
   *   Layer 1 simultaneously. The DB will reject the second INSERT with a unique
   *   violation which we catch and re-throw as a 409 ConflictException.
   */
  async create(dto: CreateBookingDto, customerId: string) {
    return this.prisma.$transaction(async (tx) => {
      // ── 1. Lock the Court row (SELECT FOR UPDATE) ─────────────
      // While this transaction is open, any other transaction trying
      // to lock the same court row will WAIT — preventing races.
      const courts = await tx.$queryRaw<
        Array<{
          id: string;
          pricePerHour: string;
          openingTime: string;
          closingTime: string;
          venueId: string;
        }>
      >`SELECT id, "pricePerHour", "openingTime", "closingTime", "venueId"
        FROM "Court"
        WHERE id = ${dto.courtId}
        FOR UPDATE`;

      if (!courts || courts.length === 0) {
        throw new NotFoundException(`Court ${dto.courtId} not found`);
      }

      const court = courts[0];

      // ── 2. Validate slot is within court opening hours ─────────
      const [startHour] = dto.startTime.split(':').map(Number);
      const [endHour] = dto.endTime.split(':').map(Number);
      const [openHour] = court.openingTime.split(':').map(Number);
      const [closeHour] = court.closingTime.split(':').map(Number);

      if (startHour < openHour || endHour > closeHour) {
        throw new BadRequestException(
          `Slot must be within court hours: ${court.openingTime} - ${court.closingTime}`,
        );
      }

      if (endHour - startHour !== 1) {
        throw new BadRequestException('Booking duration must be exactly 1 hour');
      }

      // ── 3. Parse booking date (midnight UTC) ───────────────────
      const parsedDate = new Date(dto.date);
      if (isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }
      const bookingDate = new Date(
        Date.UTC(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
        ),
      );

      // ── 4. Application-level conflict check ────────────────────
      // Belt-and-suspenders check BEFORE attempting the insert.
      // Even if two requests passed the lock, this catches duplicates.
      const conflict = await tx.booking.findFirst({
        where: {
          courtId: dto.courtId,
          date: bookingDate,
          startTime: dto.startTime,
          status: { not: BookingStatus.CANCELLED },
        },
      });

      if (conflict) {
        throw new ConflictException(
          'This time slot is already booked. Please choose another slot.',
        );
      }

      // ── 5. Calculate total price ───────────────────────────────
      // Duration is always 1 hour, so price = pricePerHour × 1
      const totalPrice = new Decimal(court.pricePerHour);

      // ── 6. Create Booking (status: PENDING) ───────────────────
      // If a race condition somehow slipped through steps 1-4,
      // the @@unique([courtId, date, startTime]) DB constraint will
      // reject this INSERT with a unique violation → caught below.
      const booking = await tx.booking.create({
        data: {
          customerId,
          courtId: dto.courtId,
          date: bookingDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: BookingStatus.PENDING,
          totalPrice,
        },
        include: {
          court: {
            include: {
              venue: { select: { id: true, name: true, city: true } },
            },
          },
        },
      });

      // ── 7. Create Payment record (status: PENDING) ─────────────
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          status: PaymentStatus.PENDING,
          method: 'mock_card',
        },
      });

      return booking;
    }).catch((error) => {
      // Catch Prisma unique constraint violation (P2002)
      // This is the DB-level double-booking safety net
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'This time slot was just booked by someone else. Please choose another slot.',
        );
      }
      throw error;
    });
  }

  // ── GET /bookings/me (Customer — own bookings) ────────────────
  async findMine(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        court: {
          include: {
            venue: { select: { id: true, name: true, city: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── GET /bookings/venue/:venueId (Venue Owner — their venue's bookings) ──
  async findByVenue(venueId: string, ownerId: string) {
    // Verify ownership
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    if (venue.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this venue');
    }

    return this.prisma.booking.findMany({
      where: { court: { venueId } },
      include: {
        court: { select: { id: true, name: true, sportType: true } },
        customer: { select: { id: true, name: true, email: true } },
        payment: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  // ── GET /bookings (Admin — all bookings) ─────────────────────
  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        court: {
          include: {
            venue: { select: { id: true, name: true, city: true } },
          },
        },
        customer: { select: { id: true, name: true, email: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── PATCH /bookings/:id/cancel ────────────────────────────────
  async cancel(bookingId: string, userId: string, userRole: Role) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Only the customer who owns the booking or an Admin can cancel
    if (booking.customerId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You cannot cancel this booking');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    // Cancellation cutoff: must be at least 1 hour before the slot
    const now = new Date();
    const bookingDateTime = new Date(booking.date);
    const [slotHour] = booking.startTime.split(':').map(Number);
    bookingDateTime.setUTCHours(slotHour);

    const oneHourBefore = new Date(bookingDateTime.getTime() - 60 * 60 * 1000);
    if (now > oneHourBefore && userRole !== Role.ADMIN) {
      throw new BadRequestException(
        'Cancellation is not allowed within 1 hour of the slot',
      );
    }

    // Cancel booking + refund payment in a transaction
    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CANCELLED },
      });

      if (booking.payment) {
        await tx.payment.update({
          where: { bookingId },
          data: { status: PaymentStatus.REFUNDED },
        });
      }

      return cancelled;
    });
  }

  // ── PATCH /bookings/:id/confirm (Venue Owner) ─────────────────
  async confirm(bookingId: string, ownerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        court: { include: { venue: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    // Verify the venue owner owns this court's venue
    if (booking.court.venue.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You can only confirm bookings for your own venues',
      );
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm a booking with status: ${booking.status}`,
      );
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });
  }
}
