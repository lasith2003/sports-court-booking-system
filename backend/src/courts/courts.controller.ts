import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role, SportType } from '@prisma/client';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Courts')
@Controller()
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  // ── POST /venues/:venueId/courts ─────────────────────────────
  @Post('venues/:venueId/courts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER] Add a court to a venue' })
  @ApiResponse({ status: 201, description: 'Court created' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  create(
    @Param('venueId') venueId: string,
    @Body() dto: CreateCourtDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.courtsService.create(venueId, dto, user.id);
  }

  // ── GET /courts (public search with filters) ──────────────────
  @Get('courts')
  @ApiOperation({ summary: 'Search courts with filters (public)' })
  @ApiQuery({ name: 'sportType', enum: SportType, required: false })
  @ApiQuery({ name: 'city', required: false, example: 'Colombo' })
  @ApiQuery({ name: 'minPrice', required: false, example: '500' })
  @ApiQuery({ name: 'maxPrice', required: false, example: '2000' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiResponse({ status: 200, description: 'Paginated list of courts' })
  findAll(
    @Query('sportType') sportType?: SportType,
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.courtsService.findAll({
      sportType,
      city,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
    });
  }

  // ── GET /courts/:id (public) ──────────────────────────────────
  @Get('courts/:id')
  @ApiOperation({ summary: 'Get a single court by ID (public)' })
  @ApiResponse({ status: 200, description: 'Court details' })
  @ApiResponse({ status: 404, description: 'Court not found' })
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  // ── GET /courts/:id/availability?date=YYYY-MM-DD ──────────────
  @Get('courts/:id/availability')
  @ApiOperation({
    summary: 'Get available time slots for a court on a given date (public)',
    description:
      'Dynamically computes 1-hour slots between court opening/closing hours, minus any existing non-cancelled bookings.',
  })
  @ApiQuery({ name: 'date', required: true, example: '2026-09-15' })
  @ApiResponse({
    status: 200,
    description: 'Array of { startTime, endTime, isAvailable } slot objects',
  })
  getAvailability(
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    return this.courtsService.getAvailability(id, date);
  }

  // ── PATCH /courts/:id ─────────────────────────────────────────
  @Patch('courts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER / ADMIN] Update a court' })
  @ApiResponse({ status: 200, description: 'Court updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourtDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.courtsService.update(id, dto, user.id, user.role);
  }

  // ── DELETE /courts/:id ────────────────────────────────────────
  @Delete('courts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER / ADMIN] Delete a court' })
  @ApiResponse({ status: 200, description: 'Court deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.courtsService.remove(id, user.id, user.role);
  }
}
