import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } });
  }

  async findByKey(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting '${key}' not found`);
    return setting;
  }

  async findByScope(scope: string) {
    return this.prisma.systemSetting.findMany({ where: { scope }, orderBy: { key: 'asc' } });
  }

  async upsert(key: string, data: { value: unknown; type?: string; description?: string; scope?: string; updatedById?: string }) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value: JSON.stringify(data.value),
        type: data.type || 'string',
        description: data.description,
        scope: data.scope || 'global',
        updatedById: data.updatedById,
      },
      update: {
        value: JSON.stringify(data.value),
        description: data.description,
        updatedById: data.updatedById,
      },
    });
  }

  async getValue(key: string, fallback?: unknown) {
    try {
      const setting = await this.findByKey(key);
      return setting.value;
    } catch {
      return fallback;
    }
  }
}
