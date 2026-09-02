import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(data: { name: string; description?: string; permissionIds?: string[] }) {
    const existing = await this.prisma.role.findUnique({ where: { name: data.name } });
    if (existing) throw new ConflictException('Role name already exists');

    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissionIds?.length
          ? {
              create: data.permissionIds.map((permissionId) => ({
                permissionId,
                grantedBy: 'system',
              })),
            }
          : undefined,
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async assignPermission(roleId: string, permissionId: string) {
    await this.findById(roleId);
    const permission = await this.prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    const existing = await this.prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    if (existing) throw new ConflictException('Permission already assigned');

    return this.prisma.rolePermission.create({
      data: { roleId, permissionId, grantedBy: 'system' },
    });
  }

  async removePermission(roleId: string, permissionId: string) {
    return this.prisma.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany();
  }
}
