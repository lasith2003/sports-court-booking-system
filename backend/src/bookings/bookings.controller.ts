import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── POST /bookings ────────────────────────────────────────────
  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({
    summary: '[CUSTOMER] Create a new booking',
    description:
      '⭐ Concurrency-safe: uses a DB transaction with row-level locking + ' +
      'unique constraint to prevent double-booking. Returns 409 if slot is taken.',
  })
  @ApiResponse({ status: 201, description: 'Booking created (status: PENDING)' })
  @ApiResponse({ status: 400, description: 'Invalid slot / outside opening hours' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  @ApiResponse({ status: 409, description: 'Slot already booked — conflict' })
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.bookingsService.create(dto, user.id);
  }

  // ── GET /bookings/me ──────────────────────────────────────────
  @Get('me')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: '[CUSTOMER] Get my own bookings' })
  @ApiResponse({ status: 200, description: 'List of customer bookings' })
  findMine(@CurrentUser() user: { id: string }) {
    return this.bookingsService.findMine(user.id);
  }

  // ── GET /bookings/venue/:venueId ──────────────────────────────
  @Get('venue/:venueId')
  @Roles(Role.VENUE_OWNER)
  @ApiOperation({ summary: '[VENUE_OWNER] Get all bookings for my venue' })
  @ApiResponse({ status: 200, description: 'List of bookings for the venue' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  findByVenue(
    @Param('venueId') venueId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bookingsService.findByVenue(venueId, user.id);
  }

  // ── PATCH /bookings/:id/cancel ────────────────────────────────
  @Patch(':id/cancel')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({
    summary: '[CUSTOMER / ADMIN] Cancel a booking',
    description: 'Customer can cancel up to 1 hour before the slot. Admin can cancel anytime.',
  })
  @ApiResponse({ status: 200, description: 'Booking cancelled, payment refunded' })
  @ApiResponse({ status: 400, description: 'Cannot cancel (too late or already completed)' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your booking' })
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.bookingsService.cancel(id, user.id, user.role);
  }

  // ── PATCH /bookings/:id/confirm ───────────────────────────────
  @Patch(':id/confirm')
  @Roles(Role.VENUE_OWNER)
  @ApiOperation({ summary: '[VENUE_OWNER] Confirm a pending booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  @ApiResponse({ status: 400, description: 'Booking is not in PENDING status' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your venue' })
  confirm(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.bookingsService.confirm(id, user.id);
  }

  // ── GET /bookings (Admin only) ────────────────────────────────
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Get all platform bookings' })
  @ApiResponse({ status: 200, description: 'All bookings across the platform' })
  findAll() {
    return this.bookingsService.findAll();
  }
}
