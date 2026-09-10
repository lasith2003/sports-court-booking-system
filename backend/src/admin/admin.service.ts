import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Platform Statistics ───────────────────────────────────────
  async getStats() {
    const [
      totalUsers,
      totalVenues,
      totalCourts,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
      revenueResult,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.venue.count(),
      this.prisma.court.count(),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID },
      }),
    ]);

    return {
      users: totalUsers,
      venues: totalVenues,
      courts: totalCourts,
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings,
      },
      revenue: {
        totalPaid: revenueResult._sum.amount ?? 0,
        currency: 'LKR',
      },
    };
  }

  // ── User Management ───────────────────────────────────────────
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: `User ${user.email} has been deleted` };
  }

  // ── Venue Management ──────────────────────────────────────────
  async getAllVenues() {
    return this.prisma.venue.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { courts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteVenue(venueId: string) {
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException('Venue not found');
    await this.prisma.venue.delete({ where: { id: venueId } });
    return { message: `Venue "${venue.name}" has been removed` };
  }

  // ── Booking Management ────────────────────────────────────────
  async getAllBookings() {
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

  async cancelBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

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

      return { message: 'Booking cancelled by admin', booking: cancelled };
    });
  }
}
