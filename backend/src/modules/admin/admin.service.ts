import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_PUBLIC_SELECT = {
  id: true,
  userId: true,
  username: true,
  status: true,
  badge: true,
  department: true,
  level: true,
  isSuperAdmin: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { userId },
      select: ADMIN_PUBLIC_SELECT,
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async create(data: { userId: string; badge?: string; department?: string; level?: number }) {
    return this.prisma.adminUser.create({
      data: {
        userId: data.userId,
        badge: data.badge,
        department: data.department,
        level: data.level || 1,
      },
      select: ADMIN_PUBLIC_SELECT,
    });
  }

  async findAll() {
    return this.prisma.adminUser.findMany({
      select: ADMIN_PUBLIC_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, data: { department?: string; level?: number; isSuperAdmin?: boolean }) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id }, select: { id: true } });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.adminUser.update({
      where: { id },
      data,
      select: ADMIN_PUBLIC_SELECT,
    });
  }
}
