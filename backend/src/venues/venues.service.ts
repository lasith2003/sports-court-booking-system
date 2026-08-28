import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ────────────────────────────────────────────────────
  async create(dto: CreateVenueDto, ownerId: string) {
    return this.prisma.venue.create({
      data: { ...dto, ownerId },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
  }

  // ── List (public) ─────────────────────────────────────────────
  async findAll(city?: string) {
    return this.prisma.venue.findMany({
      where: city ? { city: { contains: city, mode: 'insensitive' } } : {},
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { courts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Single (public) ───────────────────────────────────────────
  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        courts: true,
      },
    });
    if (!venue) throw new NotFoundException(`Venue ${id} not found`);
    return venue;
  }

  // ── Update (owner only, or Admin) ─────────────────────────────
  async update(
    id: string,
    dto: UpdateVenueDto,
    userId: string,
    userRole: Role,
  ) {
    const venue = await this.findOne(id);
    this.checkOwnership(venue.ownerId, userId, userRole);
    return this.prisma.venue.update({ where: { id }, data: dto });
  }

  // ── Delete (owner only, or Admin) ─────────────────────────────
  async remove(id: string, userId: string, userRole: Role) {
    const venue = await this.findOne(id);
    this.checkOwnership(venue.ownerId, userId, userRole);
    await this.prisma.venue.delete({ where: { id } });
    return { message: 'Venue deleted successfully' };
  }

  // ── Update Image URL ──────────────────────────────────────────
  async updateImageUrl(id: string, imageUrl: string) {
    return this.prisma.venue.update({ where: { id }, data: { imageUrl } });
  }

  // ── Helper: ownership check ───────────────────────────────────
  private checkOwnership(ownerId: string, userId: string, userRole: Role) {
    if (ownerId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to modify this venue',
      );
    }
  }
}
