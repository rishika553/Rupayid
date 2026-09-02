import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReferral(referrerId: string) {
    const code = `RAP-${uuid().slice(0, 8).toUpperCase()}`;

    return this.prisma.referral.create({
      data: {
        referrerId,
        code,
        status: 'PENDING',
      },
    });
  }

  async findByReferrer(referrerId: string) {
    return this.prisma.referral.findMany({
      where: { referrerId },
      include: {
        referee: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCode(code: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { code },
      include: {
        referrer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!referral) throw new NotFoundException('Referral not found');
    return referral;
  }

  async acceptReferral(code: string, refereeId: string) {
    const referral = await this.findByCode(code);
    if (referral.status !== 'PENDING') {
      throw new Error('Referral is no longer pending');
    }

    return this.prisma.referral.update({
      where: { id: referral.id },
      data: {
        refereeId,
        status: 'ACCEPTED',
      },
    });
  }

  async getReferralStats(userId: string) {
    const [total, pending, converted] = await Promise.all([
      this.prisma.referral.count({ where: { referrerId: userId } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'PENDING' } }),
      this.prisma.referral.count({ where: { referrerId: userId, status: 'CONVERTED' } }),
    ]);

    return { total, pending, converted };
  }
}
