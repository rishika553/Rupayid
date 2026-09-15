import { Body, Controller, Get, HttpCode, Logger, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

class ContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subject?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch {
      checks.database = 'disconnected';
    }

    const allHealthy = Object.values(checks).every((v) => v === 'connected');

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      version: process.env.npm_package_version || '0.1.0',
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready' };
    } catch {
      return { status: 'not ready' };
    }
  }

  @Post('contact')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Public contact form' })
  async contact(@Body() dto: ContactDto) {
    this.logger.log(
      `Contact form from ${dto.name} <${dto.email}> — ${dto.subject || 'Website enquiry'}: ${dto.message.slice(0, 240)}`,
    );
    return { message: 'Thanks. Our team will get back to you.' };
  }
}
