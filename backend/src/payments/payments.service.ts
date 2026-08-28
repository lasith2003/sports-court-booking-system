import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Mock Payment Confirmation ─────────────────────────────────
  /**
   * Simulates payment confirmation (no real payment gateway).
   * Flow:
   *  1. Verify the booking belongs to the requesting customer.
   *  2. Verify payment is still PENDING (not already paid).
   *  3. In a single transaction:
   *       a. Set Payment.status → PAID
   *       b. Set Booking.status → CONFIRMED
   *  4. Return the updated booking with payment info.
   *
   * In a real system, this endpoint would be replaced by a webhook
   * from Stripe/PayHere triggered after actual payment completes.
   */
  async confirmPayment(bookingId: string, customerId: string) {
    // 1. Find the booking + payment
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // 2. Ownership check — only the booking's customer can pay
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('You cannot pay for another customer\'s booking');
    }

    // 3. Check booking is still PENDING
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm payment — booking status is already: ${booking.status}`,
      );
    }

    // 4. Check payment record exists and is PENDING
    if (!booking.payment) {
      throw new NotFoundException('Payment record not found for this booking');
    }

    if (booking.payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Payment is already in status: ${booking.payment.status}`,
      );
    }

    // 5. Confirm payment + transition booking — atomic transaction
    const [updatedPayment, updatedBooking] = await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { bookingId },
        data: { status: PaymentStatus.PAID },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
        include: {
          court: {
            include: {
              venue: { select: { id: true, name: true, city: true } },
            },
          },
          payment: true,
        },
      }),
    ]);

    return {
      message: 'Payment confirmed successfully. Booking is now CONFIRMED.',
      booking: updatedBooking,
      payment: updatedPayment,
    };
  }

  // ── Get payment by booking ID ─────────────────────────────────
  async getPaymentByBooking(bookingId: string, customerId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) {
      throw new ForbiddenException('Access denied');
    }
    if (!booking.payment) throw new NotFoundException('Payment not found');

    return booking.payment;
  }
}
