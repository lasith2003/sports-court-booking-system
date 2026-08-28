import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ── POST /payments/:bookingId/confirm ─────────────────────────
  @Post(':bookingId/confirm')
  @Roles(Role.CUSTOMER)
  @ApiOperation({
    summary: '[CUSTOMER] Mock payment confirmation',
    description:
      'Simulates a payment gateway webhook. Sets Payment status → PAID and ' +
      'Booking status → CONFIRMED in a single atomic transaction. ' +
      'In production, this would be triggered by a real payment provider (e.g. Stripe).',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment confirmed. Booking is now CONFIRMED.',
  })
  @ApiResponse({ status: 400, description: 'Booking/payment already in non-PENDING state' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your booking' })
  @ApiResponse({ status: 404, description: 'Booking or payment not found' })
  confirmPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentsService.confirmPayment(bookingId, user.id);
  }

  // ── GET /payments/:bookingId ──────────────────────────────────
  @Get(':bookingId')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: '[CUSTOMER] Get payment info for a booking' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 403, description: 'Forbidden — not your booking' })
  @ApiResponse({ status: 404, description: 'Booking or payment not found' })
  getPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentsService.getPaymentByBooking(bookingId, user.id);
  }
}
