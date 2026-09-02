import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    return this.prisma.adminUser.findUnique({
      where: { userId },
      include: { user: true },
    });
  }

  async create(data: { userId: string; badge?: string; department?: string; level?: number }) {
    return this.prisma.adminUser.create({
      data: {
        userId: data.userId,
        badge: data.badge,
        department: data.department,
        level: data.level || 1,
      },
    });
  }

  async findAll() {
    return this.prisma.adminUser.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });
  }

  async update(id: string, data: { department?: string; level?: number; isSuperAdmin?: boolean }) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.adminUser.update({ where: { id }, data });
  }
}
