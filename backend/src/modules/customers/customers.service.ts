import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

const KYC_EDITABLE = ['DRAFT', 'RESUBMISSION_REQUIRED'] as const;
const INTERNAL_EMAIL_SUFFIX = '@users.rupayaid.internal';

type KycDetailsRow = {
  dateOfBirth: Date | null;
  gender: string | null;
  fatherOrSpouseName: string | null;
  maritalStatus: string | null;
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
};

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMine(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        middleName: true,
        email: true,
        emailVerified: true,
        phoneNumber: true,
        phoneVerified: true,
        status: true,
        referralCode: true,
        createdAt: true,
        profile: true,
        kycApplications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            referenceCode: true,
            submittedAt: true,
            reviewedAt: true,
            details: true,
            decisions: {
              select: { decision: true, reason: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }
    return this.toPublic(user);
  }

  async updateMine(
    userId: string,
    dto: UpdateCustomerProfileDto,
    ip?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        kycApplications: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { details: true },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }

    const kyc = user.kycApplications[0];
    const identityLocked = Boolean(kyc && !(KYC_EDITABLE as readonly string[]).includes(kyc.status));
    this.assertAdult(dto.dateOfBirth);

    if (identityLocked) {
      const locked = [
        'dateOfBirth',
        'panLastFour',
        'aadhaarLastFour',
        'idDocumentType',
        'accountHolderName',
        'accountLastFour',
        'ifsc',
        'bankName',
        'accountType',
      ] as const;
      const attempted = locked.filter((field) => dto[field] !== undefined);
      if (attempted.length) {
        throw new ForbiddenException('Identity and bank details can only be changed while KYC is editable');
      }
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const taken = await this.prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException('This email is already in use');
      }
    }

    const nextEmail = dto.email?.toLowerCase();
    const income =
      dto.yearlyIncome !== undefined ? new Prisma.Decimal(dto.yearlyIncome) : undefined;

    const userUpdate: Prisma.UserUpdateInput = {
      ...(dto.firstName ? { firstName: dto.firstName } : {}),
      ...(dto.lastName ? { lastName: dto.lastName } : {}),
      ...(dto.middleName !== undefined ? { middleName: dto.middleName || null } : {}),
      ...(nextEmail ? { email: nextEmail, emailVerified: nextEmail === user.email ? user.emailVerified : false } : {}),
    };

    const profileUpdate = {
      ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.state !== undefined ? { state: dto.state } : {}),
      ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
      ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
      ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 || null } : {}),
      ...(dto.occupation !== undefined ? { occupation: dto.occupation } : {}),
      ...(income !== undefined ? { yearlyIncome: income } : {}),
      ...(dto.panLastFour !== undefined
        ? { panLastFour: dto.panLastFour.toUpperCase(), panNumber: `XXXX${dto.panLastFour.toUpperCase()}` }
        : {}),
      ...(dto.aadhaarLastFour !== undefined ? { aadhaarLastFour: dto.aadhaarLastFour } : {}),
    };

    const kycDetailsUpdate = {
      ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.fatherOrSpouseName !== undefined ? { fatherOrSpouseName: dto.fatherOrSpouseName } : {}),
      ...(dto.maritalStatus !== undefined ? { maritalStatus: dto.maritalStatus } : {}),
      ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 } : {}),
      ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 || null } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.state !== undefined ? { state: dto.state } : {}),
      ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
      ...(dto.residenceType !== undefined ? { residenceType: dto.residenceType } : {}),
      ...(dto.panLastFour !== undefined ? { panLastFour: dto.panLastFour.toUpperCase() } : {}),
      ...(dto.aadhaarLastFour !== undefined ? { aadhaarLastFour: dto.aadhaarLastFour } : {}),
      ...(dto.idDocumentType !== undefined ? { idDocumentType: dto.idDocumentType } : {}),
      ...(dto.accountHolderName !== undefined ? { accountHolderName: dto.accountHolderName } : {}),
      ...(dto.accountLastFour !== undefined ? { accountLastFour: dto.accountLastFour } : {}),
      ...(dto.ifsc !== undefined ? { ifsc: dto.ifsc } : {}),
      ...(dto.bankName !== undefined ? { bankName: dto.bankName } : {}),
      ...(dto.accountType !== undefined ? { accountType: dto.accountType } : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdate).length) {
        await tx.user.update({ where: { id: userId }, data: userUpdate });
      }
      await tx.customerProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileUpdate,
        },
        update: profileUpdate,
      });
      if (kyc && (KYC_EDITABLE as readonly string[]).includes(kyc.status) && Object.keys(kycDetailsUpdate).length) {
        await tx.kycDetails.upsert({
          where: { kycApplicationId: kyc.id },
          create: { kycApplicationId: kyc.id, ...kycDetailsUpdate },
          update: kycDetailsUpdate,
        });
      }
    });

    const changed = this.diffFields(user, kyc?.details, dto);
    if (changed.length) {
      await this.audit.log({
        actionType: 'PROFILE_UPDATED',
        entityType: 'CustomerProfile',
        entityId: userId,
        eventCategory: 'PROFILE',
        changedById: userId,
        changedForUserId: userId,
        message: 'Customer updated their profile',
        diffSummary: { fields: changed },
        ipAddress: ip,
        userAgent,
      });
    }

    return this.getMine(userId);
  }

  private assertAdult(dateOfBirth?: string) {
    if (!dateOfBirth) {
      return;
    }
    const date = new Date(`${dateOfBirth.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Enter a valid date of birth');
    }
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (date > cutoff) {
      throw new BadRequestException('You must be at least 18 years old');
    }
  }

  private publicEmail(email: string) {
    return email.endsWith(INTERNAL_EMAIL_SUFFIX) ? null : email;
  }

  private toPublic(user: {
    firstName: string;
    lastName: string;
    middleName: string | null;
    email: string;
    emailVerified: boolean;
    phoneNumber: string | null;
    phoneVerified: boolean;
    status: string;
    referralCode: string | null;
    createdAt: Date;
    profile: {
      dateOfBirth: Date | null;
      gender: string | null;
      occupation: string | null;
      yearlyIncome: Prisma.Decimal | null;
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      panLastFour: string | null;
      aadhaarLastFour: string | null;
      hasKycCompleted: boolean;
    } | null;
    kycApplications: Array<{
      status: string;
      referenceCode: string | null;
      submittedAt: Date | null;
      reviewedAt: Date | null;
      details: KycDetailsRow | null;
      decisions?: Array<{ decision: string; reason: string | null }>;
    }>;
  }) {
    const kyc = user.kycApplications[0];
    const details = kyc?.details;
    const profile = user.profile;
    const identityLocked = Boolean(kyc && !(KYC_EDITABLE as readonly string[]).includes(kyc.status));

    return {
      personal: {
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName,
        dateOfBirth: isoDate(details?.dateOfBirth || profile?.dateOfBirth),
        gender: details?.gender || profile?.gender || null,
        fatherOrSpouseName: details?.fatherOrSpouseName || null,
        maritalStatus: details?.maritalStatus || null,
        occupation: profile?.occupation || null,
      },
      contact: {
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        email: this.publicEmail(user.email),
        emailVerified: user.email.endsWith(INTERNAL_EMAIL_SUFFIX) ? false : user.emailVerified,
      },
      address: {
        addressLine1: details?.addressLine1 || profile?.addressLine1 || null,
        addressLine2: details?.addressLine2 || profile?.addressLine2 || null,
        city: details?.city || profile?.city || null,
        state: details?.state || profile?.state || null,
        pincode: details?.pincode || profile?.pincode || null,
        residenceType: details?.residenceType || null,
      },
      account: {
        status: user.status,
        referralCode: user.referralCode,
        memberSince: user.createdAt,
        yearlyIncome: profile?.yearlyIncome != null ? profile.yearlyIncome.toFixed(2) : null,
        panLastFour: details?.panLastFour || profile?.panLastFour || null,
        aadhaarLastFour: details?.aadhaarLastFour || profile?.aadhaarLastFour || null,
        idDocumentType: details?.idDocumentType || null,
        accountHolderName: details?.accountHolderName || null,
        accountLastFour: details?.accountLastFour || null,
        ifsc: details?.ifsc || null,
        bankName: details?.bankName || null,
        accountType: details?.accountType || null,
        identityLocked,
      },
      kyc: {
        status: kyc?.status || 'NOT_STARTED',
        completed: Boolean(profile?.hasKycCompleted || kyc?.status === 'APPROVED'),
        canEdit: !kyc || (KYC_EDITABLE as readonly string[]).includes(kyc.status),
        submittedAt: kyc?.submittedAt || null,
        reviewedAt: kyc?.reviewedAt || null,
        referenceCode: kyc?.referenceCode || null,
        reason: this.latestReviewReason(kyc?.decisions),
      },
    };
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

  private diffFields(
    user: {
      firstName: string;
      lastName: string;
      middleName: string | null;
      email: string;
      profile: { occupation: string | null; city: string | null; pincode: string | null } | null;
    },
    details: KycDetailsRow | null | undefined,
    dto: UpdateCustomerProfileDto,
  ) {
    const current: Record<string, unknown> = {
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      email: this.publicEmail(user.email),
      dateOfBirth: isoDate(details?.dateOfBirth),
      occupation: user.profile?.occupation,
      city: details?.city || user.profile?.city,
      pincode: details?.pincode || user.profile?.pincode,
      panLastFour: details?.panLastFour,
      aadhaarLastFour: details?.aadhaarLastFour,
      accountLastFour: details?.accountLastFour,
    };
    const next: Record<string, unknown> = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      email: dto.email?.toLowerCase(),
      dateOfBirth: dto.dateOfBirth?.slice(0, 10),
      occupation: dto.occupation,
      city: dto.city,
      pincode: dto.pincode,
      panLastFour: dto.panLastFour,
      aadhaarLastFour: dto.aadhaarLastFour,
      accountLastFour: dto.accountLastFour,
    };
    return Object.keys(next).filter((key) => next[key] !== undefined && String(next[key] ?? '') !== String(current[key] ?? ''));
  }
}

function isoDate(value?: Date | string | null) {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString().slice(0, 10);
}
