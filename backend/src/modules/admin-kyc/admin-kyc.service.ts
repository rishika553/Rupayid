import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { KycApplicationStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentAdminPayload } from '../admin-auth/current-admin.decorator';

const REVIEWABLE_STATUSES: KycApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];
const PENDING_REVIEW: KycApplicationStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];
const DOCUMENT_ADMIN_SELECT = {
  id: true,
  documentType: true,
  status: true,
  mimeType: true,
  fileSizeBytes: true,
  uploadedAt: true,
  createdAt: true,
} as const;

const CUSTOMER_ADMIN_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  phoneVerified: true,
  email: true,
} as const;

const DETAILS_ADMIN_SELECT = {
  dateOfBirth: true,
  gender: true,
  fatherOrSpouseName: true,
  maritalStatus: true,
  nationality: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  state: true,
  pincode: true,
  residenceType: true,
  panLastFour: true,
  aadhaarLastFour: true,
  idDocumentType: true,
  accountHolderName: true,
  accountLastFour: true,
  ifsc: true,
  bankName: true,
  accountType: true,
} as const;

@Injectable()
export class AdminKycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
  ) {}

  async getStats() {
    const [total, pendingReview, approved, declined] = await Promise.all([
      this.prisma.kycApplication.count(),
      this.prisma.kycApplication.count({ where: { status: { in: PENDING_REVIEW } } }),
      this.prisma.kycApplication.count({ where: { status: 'APPROVED' } }),
      this.prisma.kycApplication.count({ where: { status: 'REJECTED' } }),
    ]);

    return {
      total,
      pendingReview,
      approved,
      declined,
    };
  }

  async list(query: { page?: number; limit?: number; status?: string; search?: string }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const where = this.buildListWhere(query.status, query.search);
    const [rows, total] = await Promise.all([
      this.prisma.kycApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
        select: {
          id: true,
          userId: true,
          status: true,
          submittedAt: true,
          user: { select: CUSTOMER_ADMIN_SELECT },
        },
      }),
      this.prisma.kycApplication.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toListItem(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getById(id: string, admin: CurrentAdminPayload) {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        referenceCode: true,
        submittedAt: true,
        reviewedAt: true,
        reviewedBy: true,
        declineReason: true,
        createdAt: true,
        updatedAt: true,
        user: { select: CUSTOMER_ADMIN_SELECT },
        details: { select: DETAILS_ADMIN_SELECT },
        documents: { select: DOCUMENT_ADMIN_SELECT, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!app) {
      throw new NotFoundException('KYC application not found');
    }
    const reviewer = await this.resolveReviewer(app.reviewedBy);
    await this.audit.log({
      actionType: 'KYC_VIEWED',
      entityType: 'KycApplication',
      entityId: app.id,
      eventCategory: 'KYC',
      changedById: admin.userId,
      changedForUserId: app.userId,
      isActorAdmin: true,
      message: 'Admin viewed KYC application',
      metadata: {
        adminUserId: admin.id,
        kycId: app.id,
        customerId: app.userId,
        action: 'KYC_VIEWED',
      },
    });
    return this.toDetail(app, reviewer);
  }

  async listDocuments(id: string) {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!app) {
      throw new NotFoundException('KYC application not found');
    }

    const documents = await this.prisma.kycDocument.findMany({
      where: { kycApplicationId: id },
      select: DOCUMENT_ADMIN_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return { data: documents.map((doc) => this.toAdminDocument(doc)) };
  }

  async getDocumentUrl(kycId: string, documentId: string, admin: CurrentAdminPayload) {
    if (!admin?.id || !admin.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const application = await this.prisma.kycApplication.findUnique({
      where: { id: kycId },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            id: true,
            deletedAt: true,
            phoneNumber: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        },
      },
    });
    if (!application || !isActualCustomer(application.user)) {
      throw new NotFoundException('Document not found');
    }

    const document = await this.prisma.kycDocument.findFirst({
      where: { id: documentId, kycApplicationId: kycId },
      select: { id: true, documentType: true, fileStorageKey: true },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const signed = await this.files.getSignedDownloadUrl(document.fileStorageKey);

    await this.audit.log({
      actionType: 'KYC_DOCUMENT_VIEWED',
      entityType: 'KycDocument',
      entityId: document.id,
      eventCategory: 'KYC',
      changedById: admin.userId,
      changedForUserId: application.userId,
      isActorAdmin: true,
      message: 'Admin viewed KYC document',
      metadata: {
        adminUserId: admin.id,
        kycId: kycId,
        documentId: document.id,
        action: 'KYC_DOCUMENT_VIEWED',
      },
    });

    return {
      downloadUrl: signed.downloadUrl,
      expiresInSeconds: signed.expiresInSeconds,
    };
  }

  async approve(id: string, admin: CurrentAdminPayload) {
    const updated = await this.applyReview(id, admin, {
      status: 'APPROVED',
      declineReason: null,
      decision: 'APPROVED',
    });

    await this.prisma.customerProfile.upsert({
      where: { userId: updated.userId },
      create: { userId: updated.userId, hasKycCompleted: true },
      update: { hasKycCompleted: true },
    });

    await this.audit.log({
      actionType: 'KYC_APPROVED',
      entityType: 'KycApplication',
      entityId: id,
      eventCategory: 'KYC',
      changedById: admin.userId,
      changedForUserId: updated.userId,
      isActorAdmin: true,
      message: 'Admin approved KYC',
      diffSummary: {
        adminUserId: admin.id,
        kycId: id,
        customerId: updated.userId,
        action: 'KYC_APPROVED',
        oldStatus: updated.fromStatus,
        newStatus: 'APPROVED',
      },
      metadata: {
        adminUserId: admin.id,
        kycId: id,
        customerId: updated.userId,
        action: 'KYC_APPROVED',
        oldStatus: updated.fromStatus,
        newStatus: 'APPROVED',
      },
    });

    return { id: updated.id, status: updated.status, reviewedAt: updated.reviewedAt, reviewedBy: updated.reviewedBy };
  }

  async decline(id: string, reason: string, admin: CurrentAdminPayload) {
    const trimmed = reason.trim();
    if (!trimmed) {
      throw new BadRequestException('Reason is required');
    }

    const updated = await this.applyReview(id, admin, {
      status: 'REJECTED',
      declineReason: trimmed,
      decision: 'REJECTED',
      reason: trimmed,
    });

    await this.audit.log({
      actionType: 'KYC_DECLINED',
      entityType: 'KycApplication',
      entityId: id,
      eventCategory: 'KYC',
      changedById: admin.userId,
      changedForUserId: updated.userId,
      isActorAdmin: true,
      message: 'Admin declined KYC',
      diffSummary: {
        adminUserId: admin.id,
        kycId: id,
        customerId: updated.userId,
        action: 'KYC_DECLINED',
        oldStatus: updated.fromStatus,
        newStatus: 'REJECTED',
        reason: trimmed,
      },
      metadata: {
        adminUserId: admin.id,
        kycId: id,
        customerId: updated.userId,
        action: 'KYC_DECLINED',
        oldStatus: updated.fromStatus,
        newStatus: 'REJECTED',
        reason: trimmed,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      declineReason: updated.declineReason,
      reviewedAt: updated.reviewedAt,
      reviewedBy: updated.reviewedBy,
    };
  }

  private async applyReview(
    id: string,
    admin: CurrentAdminPayload,
    input: {
      status: 'APPROVED' | 'REJECTED';
      declineReason: string | null;
      decision: 'APPROVED' | 'REJECTED';
      reason?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.kycApplication.findUnique({ where: { id } });
      if (!current) {
        throw new NotFoundException('KYC application not found');
      }
      if (!REVIEWABLE_STATUSES.includes(current.status)) {
        throw new ConflictException('This KYC application cannot be reviewed');
      }

      const locked = await tx.kycApplication.updateMany({
        where: { id, status: { in: REVIEWABLE_STATUSES } },
        data: {
          status: input.status,
          reviewedAt: new Date(),
          reviewedBy: admin.id,
          declineReason: input.declineReason,
        },
      });
      if (locked.count !== 1) {
        throw new ConflictException('This KYC application cannot be reviewed');
      }

      const updated = await tx.kycApplication.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          status: true,
          reviewedAt: true,
          reviewedBy: true,
          declineReason: true,
        },
      });
      if (!updated) {
        throw new NotFoundException('KYC application not found');
      }

      await tx.kycVerificationDecisionRecord.create({
        data: {
          kycApplicationId: id,
          decision: input.decision,
          reason: input.reason,
          reviewedById: admin.id,
        },
      });
      await tx.kycSubmissionHistory.create({
        data: {
          kycApplicationId: id,
          fromStatus: current.status,
          toStatus: input.status,
          snapshot: { decision: input.decision, reason: input.reason ?? null, adminUserId: admin.id } as never,
          createdById: admin.userId,
        },
      });

      return { ...updated, fromStatus: current.status };
    });
  }

  private buildListWhere(statusRaw?: string, searchRaw?: string): Prisma.KycApplicationWhereInput {
    const where: Prisma.KycApplicationWhereInput = {};
    const status = this.parseStatusFilter(statusRaw);
    if (status) {
      where.status = status;
    }

    const search = searchRaw?.trim();
    if (search) {
      const parts = search.split(/\s+/).filter(Boolean);
      const nameOrPhone: Prisma.KycApplicationWhereInput[] = [
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phoneNumber: { contains: search, mode: 'insensitive' } } },
      ];
      if (parts.length >= 2) {
        nameOrPhone.push({
          user: {
            AND: [
              { firstName: { contains: parts[0], mode: 'insensitive' } },
              { lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
            ],
          },
        });
      }
      const digits = search.replace(/\D/g, '');
      if (digits.length >= 4) {
        nameOrPhone.push({ user: { phoneNumber: { contains: digits } } });
      }
      where.OR = nameOrPhone;
    }

    return where;
  }

  private parseStatusFilter(raw?: string): Prisma.EnumKycApplicationStatusFilter | undefined {
    if (!raw?.trim()) {
      return undefined;
    }
    const value = raw.trim().toUpperCase();
    if (value === 'PENDING' || value === 'PENDING_REVIEW') {
      return { in: PENDING_REVIEW };
    }
    if (value === 'DECLINED') {
      return { equals: 'REJECTED' };
    }
    const allowed: KycApplicationStatus[] = [
      'NOT_SUBMITTED',
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'MORE_INFO_REQUIRED',
      'RESUBMISSION_REQUIRED',
      'APPROVED',
      'REJECTED',
    ];
    if (!allowed.includes(value as KycApplicationStatus)) {
      throw new BadRequestException('Invalid KYC status filter');
    }
    return { equals: value as KycApplicationStatus };
  }

  private toListItem(row: {
    id: string;
    userId: string;
    status: string;
    submittedAt: Date | null;
    user: { firstName: string | null; lastName: string | null; phoneNumber: string | null };
  }) {
    return {
      id: row.id,
      customerId: row.userId,
      customerName: formatCustomerName(row.user.firstName, row.user.lastName),
      mobile: row.user.phoneNumber,
      submittedAt: row.submittedAt,
      status: row.status,
    };
  }

  private toDetail(app: {
    id: string;
    userId: string;
    status: string;
    referenceCode: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    reviewedBy: string | null;
    declineReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      phoneNumber: string | null;
      phoneVerified: boolean;
      email: string | null;
    };
    details: {
      dateOfBirth: Date | null;
      gender: string | null;
      fatherOrSpouseName: string | null;
      maritalStatus: string | null;
      nationality: string | null;
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      residenceType: string | null;
      panLastFour: string | null;
      aadhaarLastFour: string | null;
      idDocumentType: string | null;
      accountHolderName: string | null;
      accountLastFour: string | null;
      ifsc: string | null;
      bankName: string | null;
      accountType: string | null;
    } | null;
    documents: Array<{
      id: string;
      documentType: string;
      status: string;
      mimeType: string | null;
      fileSizeBytes: number | null;
      uploadedAt: Date;
      createdAt: Date;
    }>;
  },
    reviewer: string | null,
  ) {
    const details = app.details;
    return {
      id: app.id,
      status: app.status,
      referenceCode: app.referenceCode,
      submittedAt: app.submittedAt,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedBy,
      reviewer,
      declineReason: app.declineReason,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      customer: {
        id: app.user.id,
        name: formatCustomerName(app.user.firstName, app.user.lastName),
        firstName: app.user.firstName,
        lastName: app.user.lastName,
        mobile: app.user.phoneNumber,
        phoneVerified: app.user.phoneVerified,
        email: app.user.email,
        address: formatAddress(details),
      },
      details,
      documents: app.documents.map((doc) => this.toAdminDocument(doc)),
    };
  }

  private async resolveReviewer(reviewedBy?: string | null) {
    if (!reviewedBy) {
      return null;
    }
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: reviewedBy },
      select: { username: true },
    });
    if (adminUser?.username) {
      return adminUser.username;
    }
    const user = await this.prisma.user.findUnique({
      where: { id: reviewedBy },
      select: { firstName: true, lastName: true },
    });
    return user ? formatCustomerName(user.firstName, user.lastName) : reviewedBy;
  }

  private toAdminDocument(doc: {
    id: string;
    documentType: string;
    status: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    uploadedAt: Date;
    createdAt: Date;
  }) {
    return {
      id: doc.id,
      documentType: doc.documentType,
      fileName: documentFileName(doc.documentType, doc.mimeType),
      status: doc.status,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      uploadedAt: doc.uploadedAt,
    };
  }
}

function isActualCustomer(
  user: {
    id: string;
    deletedAt: Date | null;
    phoneNumber: string | null;
    roles: Array<{ role: { name: string } }>;
  } | null,
) {
  if (!user || user.deletedAt) {
    return false;
  }
  const isBorrower = user.roles.some((link) => link.role.name === 'BORROWER');
  return isBorrower || Boolean(user.phoneNumber?.trim());
}

export function formatCustomerName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter((part) => Boolean(part && part.trim())).join(' ').trim() || '—';
}

function formatAddress(details: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
} | null) {
  if (!details) {
    return null;
  }
  const parts = [
    details.addressLine1,
    details.addressLine2,
    details.city,
    details.state,
    details.pincode,
  ].filter((part) => Boolean(part && String(part).trim()));
  return parts.length ? parts.join(', ') : null;
}

function documentFileName(documentType: string, mimeType?: string | null) {
  const ext =
    mimeType === 'application/pdf'
      ? '.pdf'
      : mimeType === 'image/jpeg'
        ? '.jpg'
        : mimeType === 'image/png'
          ? '.png'
          : mimeType === 'image/webp'
            ? '.webp'
            : '';
  return `${documentType.toLowerCase().replace(/_/g, '-')}${ext}`;
}
