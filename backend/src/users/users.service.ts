import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

// Safe user type — never includes password
export type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

const SELECT_SAFE_USER = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  // password: false — deliberately excluded
  // refreshToken: false — deliberately excluded
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SELECT_SAFE_USER,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: SELECT_SAFE_USER,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SELECT_SAFE_USER,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    // Returns full user including password — for internal auth use ONLY
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateRole(id: string, role: Role): Promise<SafeUser> {
    await this.findById(id); // throws 404 if not found
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: SELECT_SAFE_USER,
    });
  }
}
