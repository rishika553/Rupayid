import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(key)) throw new BadRequestException('Invalid setting key');
    const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
    const type = data.type || existing?.type || 'string';
    const value = JSON.stringify(data.value);
    const valid = type === 'string' ? typeof data.value === 'string'
      : type === 'bool' ? typeof data.value === 'boolean'
        : type === 'int' ? Number.isSafeInteger(data.value)
          : type === 'decimal' ? typeof data.value === 'number' && Number.isFinite(data.value)
            : type === 'json' && data.value != null;
    if (!valid || value === undefined || Buffer.byteLength(value) > 65536) throw new BadRequestException('Invalid setting value');
    return this.prisma.systemSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        type,
        description: data.description,
        scope: data.scope || 'global',
        updatedById: data.updatedById,
      },
      update: {
        value,
        type,
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
