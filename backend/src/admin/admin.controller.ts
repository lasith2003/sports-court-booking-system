import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── GET /admin/stats ──────────────────────────────────────────
  @Get('stats')
  @ApiOperation({
    summary: '[ADMIN] Platform-wide statistics dashboard',
    description:
      'Returns aggregated metrics: total users, venues, courts, bookings by status, and revenue.',
  })
  @ApiResponse({ status: 200, description: 'Platform statistics object' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  getStats() {
    return this.adminService.getStats();
  }

  // ── GET /admin/users ──────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: '[ADMIN] List all registered users' })
  @ApiResponse({ status: 200, description: 'Array of all platform users' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  // ── DELETE /admin/users/:id ───────────────────────────────────
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Delete a user account' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── GET /admin/venues ─────────────────────────────────────────
  @Get('venues')
  @ApiOperation({ summary: '[ADMIN] List all venues on the platform' })
  @ApiResponse({ status: 200, description: 'Array of all venues' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  getAllVenues() {
    return this.adminService.getAllVenues();
  }

  // ── DELETE /admin/venues/:id ──────────────────────────────────
  @Delete('venues/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Remove a venue from the platform' })
  @ApiResponse({ status: 200, description: 'Venue deleted' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  deleteVenue(@Param('id') id: string) {
    return this.adminService.deleteVenue(id);
  }

  // ── GET /admin/bookings ───────────────────────────────────────
  @Get('bookings')
  @ApiOperation({ summary: '[ADMIN] List all bookings across the platform' })
  @ApiResponse({ status: 200, description: 'Array of all bookings' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  getAllBookings() {
    return this.adminService.getAllBookings();
  }

  // ── PATCH /admin/bookings/:id/cancel ─────────────────────────
  @Patch('bookings/:id/cancel')
  @ApiOperation({
    summary: '[ADMIN] Force-cancel any booking',
    description: 'Admin can cancel any booking regardless of time cutoff rules.',
  })
  @ApiResponse({ status: 200, description: 'Booking cancelled by admin' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  cancelBooking(@Param('id') id: string) {
    return this.adminService.cancelBooking(id);
  }
}
