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
import { Role } from '@prisma/client';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  // ── Public ───────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'List all venues (optionally filter by city)' })
  @ApiQuery({ name: 'city', required: false, example: 'Colombo' })
  @ApiResponse({ status: 200, description: 'List of venues' })
  findAll(@Query('city') city?: string) {
    return this.venuesService.findAll(city);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single venue with its courts' })
  @ApiResponse({ status: 200, description: 'Venue details' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  // ── Protected ─────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER] Create a new venue' })
  @ApiResponse({ status: 201, description: 'Venue created' })
  @ApiResponse({ status: 403, description: 'Forbidden — Venue Owner only' })
  create(
    @Body() dto: CreateVenueDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.venuesService.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER / ADMIN] Update a venue' })
  @ApiResponse({ status: 200, description: 'Venue updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVenueDto,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.venuesService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENUE_OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[VENUE_OWNER / ADMIN] Delete a venue' })
  @ApiResponse({ status: 200, description: 'Venue deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden — must own venue' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.venuesService.remove(id, user.id, user.role);
  }
}
