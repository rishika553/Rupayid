import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ConfirmKycDocumentDto, RequestKycUploadDto, UpsertKycDetailsDto } from './dto/kyc.dto';
import { NotificationsService } from '../notifications/notifications.service';

const EDITABLE = ['DRAFT', 'RESUBMISSION_REQUIRED'] as const;
const STAFF_ROLES = ['ADMIN', 'UNDERWRITER'];

const DOCUMENT_PUBLIC_SELECT = {
  id: true,
  documentType: true,
  status: true,
  mimeType: true,
  fileSizeBytes: true,
  uploadedAt: true,
  createdAt: true,
} as const;

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async createMine(userId: string, ip?: string, userAgent?: string) {
    const existing = await this.prisma.kycApplication.findFirst({
      where: {
        userId,
        status: { in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return this.getMine(userId);
    }

    const count = await this.prisma.kycApplication.count();
    const referenceCode = `KYC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const created = await this.prisma.kycApplication.create({
      data: {
        userId,
        referenceCode,
        status: 'DRAFT',
        details: { create: {} },
      },
    });

    await this.audit.log({
      actionType: 'KYC_CREATED',
      entityType: 'KycApplication',
      entityId: created.id,
      eventCategory: 'KYC',
      changedById: userId,
      changedForUserId: userId,
      message: 'KYC application created',
      ipAddress: ip,
      userAgent,
    });

    return this.getMine(userId);
  }

  async getMine(userId: string) {
    const app = await this.prisma.kycApplication.findFirst({
      where: { userId },
      include: {
        details: true,
        documents: { select: DOCUMENT_PUBLIC_SELECT, orderBy: { createdAt: 'asc' } },
        decisions: {
          select: {
            id: true,
            decision: true,
            reason: true,
            reviewedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) {
      throw new NotFoundException('KYC application not found');
    }
    return this.toCustomerView(app);
  }

  async getStatus(userId: string) {
    const app = await this.prisma.kycApplication.findFirst({
      where: { userId },
      include: {
        documents: true,
        details: true,
        decisions: {
          select: { decision: true, reason: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) {
      return {
        status: 'NOT_STARTED',
        exists: false,
        canEdit: true,
        canSubmit: false,
        documentCount: 0,
        submittedAt: null,
        reviewedAt: null,
        referenceCode: null,
        reason: null,
      };
    }
    const editable = (EDITABLE as readonly string[]).includes(app.status);
    return {
      status: app.status,
      exists: true,
      canEdit: editable,
      canSubmit: editable && this.isReadyToSubmit(app.details, app.documents.length),
      documentCount: app.documents.length,
      submittedAt: app.submittedAt,
      reviewedAt: app.reviewedAt,
      referenceCode: app.referenceCode,
      reason: this.latestReviewReason(app.decisions),
    };
  }

  async updateMine(userId: string, dto: UpsertKycDetailsDto, ip?: string, userAgent?: string) {
    const app = await this.requireEditable(userId);

    const details = this.sanitizeDetails(dto);
    await this.prisma.kycDetails.upsert({
      where: { kycApplicationId: app.id },
      create: { kycApplicationId: app.id, ...details },
      update: details,
    });

    if (dto.aadhaarLastFour || dto.panLastFour || dto.city || dto.state || dto.pincode) {
      await this.prisma.customerProfile.upsert({
        where: { userId },
        create: {
          userId,
          aadhaarLastFour: dto.aadhaarLastFour,
          panLastFour: dto.panLastFour,
          panNumber: dto.panLastFour ? `XXXX${dto.panLastFour}` : undefined,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
        },
        update: {
          ...(dto.aadhaarLastFour ? { aadhaarLastFour: dto.aadhaarLastFour } : {}),
          ...(dto.panLastFour ? { panLastFour: dto.panLastFour, panNumber: `XXXX${dto.panLastFour}` } : {}),
          ...(dto.city ? { city: dto.city } : {}),
          ...(dto.state ? { state: dto.state } : {}),
          ...(dto.pincode ? { pincode: dto.pincode } : {}),
          ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
          ...(dto.gender ? { gender: dto.gender } : {}),
          ...(dto.addressLine1 ? { addressLine1: dto.addressLine1 } : {}),
          ...(dto.addressLine2 ? { addressLine2: dto.addressLine2 } : {}),
        },
      });
    }

    await this.audit.log({
      actionType: 'KYC_UPDATED',
      entityType: 'KycApplication',
      entityId: app.id,
      eventCategory: 'KYC',
      changedById: userId,
      changedForUserId: userId,
      message: 'KYC details updated',
      diffSummary: { fields: Object.keys(dto) },
      ipAddress: ip,
      userAgent,
    });

    return this.getMine(userId);
  }

  async submitMine(userId: string, ip?: string, userAgent?: string) {
    const app = await this.requireEditable(userId);
    const full = await this.prisma.kycApplication.findUnique({
      where: { id: app.id },
      include: { details: true, documents: true },
    });
    if (!full) {
      throw new NotFoundException('KYC application not found');
    }
    this.assertReadyToSubmit(full.details, full.documents.length);

    await this.prisma.$transaction([
      this.prisma.kycApplication.update({
        where: { id: app.id },
        data: { status: 'SUBMITTED', submittedAt: new Date() },
      }),
      this.prisma.kycSubmissionHistory.create({
        data: {
          kycApplicationId: app.id,
          fromStatus: app.status,
          toStatus: 'SUBMITTED',
          snapshot: {
            details: full.details,
            documentCount: full.documents.length,
          } as never,
          createdById: userId,
        },
      }),
    ]);

    await this.audit.log({
      actionType: 'KYC_SUBMITTED',
      entityType: 'KycApplication',
      entityId: app.id,
      eventCategory: 'KYC',
      changedById: userId,
      changedForUserId: userId,
      message: 'KYC submitted for review',
      ipAddress: ip,
      userAgent,
    });
    await this.notifications?.publish({
      eventType: 'KYC_SUBMITTED',
      userId,
      referenceId: app.id,
      dedupeKey: `kyc-submitted:${app.id}`,
      variables: { reference: app.referenceCode },
    });

    return this.getStatus(userId);
  }

  async requestUpload(userId: string, dto: RequestKycUploadDto) {
    const app = await this.requireEditable(userId);
    return this.files.getSignedUploadUrl({
      userId,
      applicationId: app.id,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
    });
  }

  async confirmDocument(userId: string, dto: ConfirmKycDocumentDto, ip?: string, userAgent?: string) {
    const app = await this.requireEditable(userId);
    this.files.assertAllowedUpload(dto.mimeType, dto.fileSizeBytes);
    if (!this.files.keyBelongsToUser(dto.objectKey, userId)) {
      throw new ForbiddenException('Invalid document reference');
    }
    if (!dto.objectKey.includes(`/${app.id}/`)) {
      throw new ForbiddenException('Invalid document reference');
    }

    const document = await this.prisma.kycDocument.create({
      data: {
        kycApplicationId: app.id,
        documentType: dto.documentType as never,
        fileStorageKey: dto.objectKey,
        fileUrl: null,
        mimeType: dto.mimeType,
        fileSizeBytes: dto.fileSizeBytes,
        fileSha256: dto.fileSha256,
        uploadedById: userId,
        status: 'UPLOADED',
      },
      select: DOCUMENT_PUBLIC_SELECT,
    });

    await this.audit.log({
      actionType: 'KYC_DOCUMENT_UPLOADED',
      entityType: 'KycDocument',
      entityId: document.id,
      eventCategory: 'KYC',
      changedById: userId,
      changedForUserId: userId,
      message: 'KYC document uploaded',
      metadata: { documentType: dto.documentType, mimeType: dto.mimeType, fileSizeBytes: dto.fileSizeBytes },
      ipAddress: ip,
      userAgent,
    });

    return document;
  }

  async getDocumentDownloadUrl(userId: string, documentId: string) {
    const document = await this.prisma.kycDocument.findUnique({
      where: { id: documentId },
      include: { kycApplication: true },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    const staff = await this.isStaff(userId);
    if (document.kycApplication.userId !== userId && !staff) {
      throw new NotFoundException('Document not found');
    }
    return this.files.getSignedDownloadUrl(document.fileStorageKey);
  }

  async findByUser(userId: string) {
    const mine = await this.getMine(userId);
    return [mine];
  }

  async findById(id: string, requesterId: string) {
    const app = await this.prisma.kycApplication.findUnique({
      where: { id },
      include: {
        details: true,
        documents: { select: DOCUMENT_PUBLIC_SELECT },
        decisions: {
          select: { id: true, decision: true, reason: true, reviewedAt: true, createdAt: true },
        },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!app) {
      throw new NotFoundException('KYC application not found');
    }
    const staff = await this.isStaff(requesterId);
    if (app.userId !== requesterId && !staff) {
      throw new NotFoundException('KYC application not found');
    }
    return staff ? app : this.toCustomerView(app);
  }

  async listPendingReviews(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] as never[] } };
    const [applications, total] = await Promise.all([
      this.prisma.kycApplication.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          documents: { select: DOCUMENT_PUBLIC_SELECT },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.kycApplication.count({ where }),
    ]);
    return { data: applications, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async reviewDecision(
    id: string,
    data: { decision: string; reason?: string; reviewedById: string },
  ) {
    await this.findById(id, data.reviewedById);
    let newStatus: 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED' = 'REJECTED';
    if (data.decision === 'APPROVED') {
      newStatus = 'APPROVED';
    } else if (data.decision === 'REQUESTED_MORE_INFO') {
      newStatus = 'RESUBMISSION_REQUIRED';
    }

    const current = await this.prisma.kycApplication.findUnique({ where: { id } });
    const [updated] = await this.prisma.$transaction([
      this.prisma.kycApplication.update({
        where: { id },
        data: {
          status: newStatus,
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
      this.prisma.kycSubmissionHistory.create({
        data: {
          kycApplicationId: id,
          fromStatus: current?.status,
          toStatus: newStatus,
          snapshot: { decision: data.decision, reason: data.reason } as never,
          createdById: data.reviewedById,
        },
      }),
    ]);

    if (newStatus === 'APPROVED') {
      const app = await this.prisma.kycApplication.findUnique({ where: { id } });
      if (app) {
        await this.prisma.customerProfile.upsert({
          where: { userId: app.userId },
          create: { userId: app.userId, hasKycCompleted: true },
          update: { hasKycCompleted: true },
        });
      }
    }

    await this.audit.log({
      actionType: newStatus === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
      entityType: 'KycApplication',
      entityId: id,
      eventCategory: 'KYC',
      changedById: data.reviewedById,
      changedForUserId: current?.userId,
      message: `KYC ${newStatus.toLowerCase()}`,
      diffSummary: { decision: data.decision, reason: data.reason },
    });
    if (current?.userId) {
      await this.notifications?.publish({
        eventType: newStatus === 'APPROVED' ? 'KYC_APPROVED' : 'KYC_REJECTED',
        userId: current.userId,
        referenceId: id,
        dedupeKey: `kyc-decision:${id}:${newStatus}`,
        variables: { reason: data.reason || '' },
      });
    }

    return updated;
  }

  private async requireEditable(userId: string) {
    const app = await this.prisma.kycApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) {
      throw new NotFoundException('KYC application not found');
    }
    if (!(EDITABLE as readonly string[]).includes(app.status)) {
      throw new ForbiddenException('This KYC application cannot be edited');
    }
    return app;
  }

  private isReadyToSubmit(
    details: {
      dateOfBirth: Date | null;
      addressLine1: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      panLastFour: string | null;
      aadhaarLastFour: string | null;
      accountLastFour: string | null;
      ifsc: string | null;
    } | null,
    documentCount: number,
  ) {
    try {
      this.assertReadyToSubmit(details, documentCount);
      return true;
    } catch {
      return false;
    }
  }

  private latestReviewReason(decisions?: Array<{ decision: string; reason: string | null }>) {
    if (!decisions?.length) {
      return null;
    }
    for (let i = decisions.length - 1; i >= 0; i -= 1) {
      const item = decisions[i];
      if (item.reason && ['REJECTED', 'REQUESTED_MORE_INFO'].includes(item.decision)) {
        return item.reason;
      }
    }
    return null;
  }

  private assertReadyToSubmit(
    details: {
      dateOfBirth: Date | null;
      addressLine1: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      panLastFour: string | null;
      aadhaarLastFour: string | null;
      accountLastFour: string | null;
      ifsc: string | null;
    } | null,
    documentCount: number,
  ) {
    if (!details?.dateOfBirth || !details.addressLine1 || !details.city || !details.state || !details.pincode) {
      throw new BadRequestException('Complete personal and address information before submitting');
    }
    if (!details.panLastFour && !details.aadhaarLastFour) {
      throw new BadRequestException('Provide identity last-four (PAN or Aadhaar) before submitting');
    }
    if (details.accountLastFour && !details.ifsc) {
      throw new BadRequestException('IFSC is required when bank account details are provided');
    }
    if (documentCount < 1) {
      throw new BadRequestException('Upload at least one KYC document before submitting');
    }
  }

  private sanitizeDetails(dto: UpsertKycDetailsDto) {
    const text = (value?: string) => {
      if (value == null) {
        return undefined;
      }
      const cleaned = value.replace(/\s+/g, ' ').trim();
      return cleaned.length ? cleaned : undefined;
    };
    return {
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: text(dto.gender),
      fatherOrSpouseName: text(dto.fatherOrSpouseName),
      maritalStatus: text(dto.maritalStatus),
      addressLine1: text(dto.addressLine1),
      addressLine2: text(dto.addressLine2),
      city: text(dto.city),
      state: text(dto.state),
      pincode: text(dto.pincode),
      residenceType: text(dto.residenceType),
      panLastFour: text(dto.panLastFour)?.toUpperCase(),
      aadhaarLastFour: text(dto.aadhaarLastFour),
      idDocumentType: text(dto.idDocumentType),
      accountHolderName: text(dto.accountHolderName),
      accountLastFour: text(dto.accountLastFour),
      ifsc: text(dto.ifsc)?.toUpperCase(),
      bankName: text(dto.bankName),
      accountType: text(dto.accountType),
    };
  }

  private toCustomerView(app: {
    id: string;
    userId: string;
    status: string;
    referenceCode: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    details: unknown;
    documents: unknown;
    decisions: unknown;
    notes?: string | null;
  }) {
    return {
      id: app.id,
      status: app.status,
      referenceCode: app.referenceCode,
      submittedAt: app.submittedAt,
      reviewedAt: app.reviewedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      personal: this.pickPersonal(app.details),
      address: this.pickAddress(app.details),
      identity: this.pickIdentity(app.details),
      bank: this.pickBank(app.details),
      documents: app.documents,
      verificationHistory: app.decisions,
    };
  }

  private pickPersonal(details: unknown) {
    const d = details as Record<string, unknown> | null;
    if (!d) {
      return null;
    }
    return {
      dateOfBirth: d.dateOfBirth,
      gender: d.gender,
      fatherOrSpouseName: d.fatherOrSpouseName,
      maritalStatus: d.maritalStatus,
      nationality: d.nationality,
    };
  }

  private pickAddress(details: unknown) {
    const d = details as Record<string, unknown> | null;
    if (!d) {
      return null;
    }
    return {
      addressLine1: d.addressLine1,
      addressLine2: d.addressLine2,
      city: d.city,
      state: d.state,
      pincode: d.pincode,
      residenceType: d.residenceType,
    };
  }

  private pickIdentity(details: unknown) {
    const d = details as Record<string, unknown> | null;
    if (!d) {
      return null;
    }
    return {
      panLastFour: d.panLastFour,
      aadhaarLastFour: d.aadhaarLastFour,
      idDocumentType: d.idDocumentType,
    };
  }

  private pickBank(details: unknown) {
    const d = details as Record<string, unknown> | null;
    if (!d) {
      return null;
    }
    return {
      accountHolderName: d.accountHolderName,
      accountLastFour: d.accountLastFour,
      ifsc: d.ifsc,
      bankName: d.bankName,
      accountType: d.accountType,
    };
  }

  private async isStaff(userId: string) {
    const links = await this.prisma.usersOnRoles.findMany({
      where: { userId },
      include: { role: true },
    });
    return links.some((link) => STAFF_ROLES.includes(link.role.name));
  }
}
