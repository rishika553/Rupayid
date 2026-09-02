import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async createApplication(userId: string) {
    const existing = await this.prisma.kycApplication.findFirst({
      where: { userId, status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'] } },
    });

    if (existing) {
      return existing;
    }

    const count = await this.prisma.kycApplication.count();
    const referenceCode = `KYC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.kycApplication.create({
      data: {
        userId,
        referenceCode,
        status: 'DRAFT',
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.kycApplication.findMany({
      where: { userId },
      include: {
        documents: true,
        decisions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id },
      include: {
        documents: true,
        decisions: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!app) throw new NotFoundException('KYC application not found');
    return app;
  }

  async submit(id: string) {
    const app = await this.findById(id);
    if (app.status !== 'DRAFT') {
      throw new Error('Only DRAFT applications can be submitted');
    }

    return this.prisma.kycApplication.update({
      where: { id },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
  }

  async addDocument(kycApplicationId: string, data: {
    documentType: string;
    fileStorageKey: string;
    fileUrl?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    fileSha256?: string;
  }) {
    return this.prisma.kycDocument.create({
      data: {
        kycApplicationId,
        documentType: data.documentType as never,
        fileStorageKey: data.fileStorageKey,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        fileSha256: data.fileSha256,
        status: 'UPLOADED',
      },
    });
  }

  async listPendingReviews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [applications, total] = await Promise.all([
      this.prisma.kycApplication.findMany({
        where: { status: 'SUBMITTED' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          documents: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.kycApplication.count({ where: { status: 'SUBMITTED' } }),
    ]);

    return {
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewDecision(id: string, data: {
    decision: string;
    reason?: string;
    reviewedById: string;
  }) {
    await this.findById(id);

    const newStatus = data.decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const [updated] = await this.prisma.$transaction([
      this.prisma.kycApplication.update({
        where: { id },
        data: {
          status: newStatus as never,
          reviewedAt: new Date(),
          reviewedBy: data.reviewedById,
        },
      }),
      this.prisma.kycVerificationDecisionRecord.create({
        data: {
          kycApplicationId: id,
          decision: data.decision as never,
          reason: data.reason,
          reviewedById: data.reviewedById,
        },
      }),
    ]);

    return updated;
  }
}
