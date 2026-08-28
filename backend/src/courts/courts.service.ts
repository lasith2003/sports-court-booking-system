import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookingStatus, Role, SportType } from '@prisma/client';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { Decimal } from '@prisma/client/runtime/library';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface CourtSearchFilters {
  sportType?: SportType;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class CourtsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create (Venue Owner) ──────────────────────────────────────
  async create(venueId: string, dto: CreateCourtDto, userId: string) {
    // Verify the venue exists and belongs to this user
    const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
    if (!venue) throw new NotFoundException(`Venue ${venueId} not found`);
    if (venue.ownerId !== userId) {
      throw new ForbiddenException('You do not own this venue');
    }

    return this.prisma.court.create({
      data: {
        ...dto,
        pricePerHour: new Decimal(dto.pricePerHour),
        venueId,
      },
      include: { venue: { select: { id: true, name: true, city: true } } },
    });
  }

  // ── Search / List (public, with filters) ─────────────────────
  async findAll(filters: CourtSearchFilters) {
    const { sportType, city, minPrice, maxPrice, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (sportType) where.sportType = sportType;
    if (city) {
      where.venue = { city: { contains: city, mode: 'insensitive' } };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.pricePerHour = {};
      if (minPrice !== undefined) where.pricePerHour.gte = new Decimal(minPrice);
      if (maxPrice !== undefined) where.pricePerHour.lte = new Decimal(maxPrice);
    }

    const [courts, total] = await Promise.all([
      this.prisma.court.findMany({
        where,
        skip,
        take: limit,
        include: {
          venue: { select: { id: true, name: true, city: true, address: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.court.count({ where }),
    ]);

    return {
      data: courts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Single Court (public) ─────────────────────────────────────
  async findOne(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            description: true,
          },
        },
      },
    });
    if (!court) throw new NotFoundException(`Court ${id} not found`);
    return court;
  }

  // ── Availability (public) ─────────────────────────────────────
  /**
   * Dynamically computes available 1-hour time slots for a court on a given date.
   *
   * Algorithm:
   * 1. Generate all 1-hour slots between openingTime and closingTime
   * 2. Fetch all non-cancelled bookings for this court on this date
   * 3. Mark any slot that overlaps with an existing booking as unavailable
   *
   * This avoids pre-generating slot records in the DB — only Booking records
   * are persisted, and availability is derived on-demand.
   */
  async getAvailability(courtId: string, dateStr: string): Promise<TimeSlot[]> {
    const court = await this.findOne(courtId);

    // Parse date — store at midnight UTC
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    const startOfDay = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Generate all 1-hour slots
    const allSlots = this.generateHourlySlots(
      court.openingTime,
      court.closingTime,
    );

    // Fetch existing bookings for this court on this date
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        courtId,
        date: { gte: startOfDay, lt: endOfDay },
        status: { not: BookingStatus.CANCELLED },
      },
      select: { startTime: true, endTime: true },
    });

    const bookedStartTimes = new Set(existingBookings.map((b) => b.startTime));

    // Mark slots
    return allSlots.map((slot) => ({
      ...slot,
      isAvailable: !bookedStartTimes.has(slot.startTime),
    }));
  }

  // ── Update (venue owner, or admin) ────────────────────────────
  async update(
    id: string,
    dto: UpdateCourtDto,
    userId: string,
    userRole: Role,
  ) {
    const court = await this.findOneWithOwner(id);
    this.checkOwnership(court.venue.ownerId, userId, userRole);

    const updateData: any = { ...dto };
    if (dto.pricePerHour) {
      updateData.pricePerHour = new Decimal(dto.pricePerHour);
    }

    return this.prisma.court.update({ where: { id }, data: updateData });
  }

  // ── Delete (venue owner, or admin) ───────────────────────────
  async remove(id: string, userId: string, userRole: Role) {
    const court = await this.findOneWithOwner(id);
    this.checkOwnership(court.venue.ownerId, userId, userRole);
    await this.prisma.court.delete({ where: { id } });
    return { message: 'Court deleted successfully' };
  }

  // ── Internal: findOne with venue owner (for ownership check) ──
  async findOneWithOwner(id: string) {
    const court = await this.prisma.court.findUnique({
      where: { id },
      include: { venue: { select: { ownerId: true } } },
    });
    if (!court) throw new NotFoundException(`Court ${id} not found`);
    return court;
  }

  // ── Helper: generate all 1-hour slots ────────────────────────
  private generateHourlySlots(
    openingTime: string,
    closingTime: string,
  ): Omit<TimeSlot, 'isAvailable'>[] {
    const slots: Omit<TimeSlot, 'isAvailable'>[] = [];
    const [openHour] = openingTime.split(':').map(Number);
    const [closeHour] = closingTime.split(':').map(Number);

    for (let hour = openHour; hour < closeHour; hour++) {
      const startTime = `${String(hour).padStart(2, '0')}:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
      slots.push({ startTime, endTime });
    }

    return slots;
  }

  // ── Helper: ownership check ───────────────────────────────────
  private checkOwnership(ownerId: string, userId: string, userRole: Role) {
    if (ownerId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to modify this court',
      );
    }
  }
}
