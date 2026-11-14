import { Transform } from 'class-transformer';
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsArray, ArrayMaxSize, ArrayUnique, IsBoolean, IsDefined, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { DisbursementMethod, DisbursementStatus, LedgerCategory, LedgerEntryDirection, LedgerEntrySource, LedgerEntryType, LoanApplicationStatus, NotificationChannel, NotificationType, Operator, PaymentDirection, PaymentMethod, PaymentStatus, PaymentTransactionType, PaymentType, RepaymentScheduleStatus, RuleType } from '@prisma/client';
export { AdminLoanApproveDto, AdminLoanRejectDto } from '../../modules/admin-ops/dto/admin-ops.dto';

// Do not let implicit conversion turn false into true or numeric strings into amounts.
const Raw = () => Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key]);
const Optional = () => ValidateIf((_object, value) => value !== undefined);

export class CreateLoanProductDto {
  @Raw() @IsString() @MinLength(1) @MaxLength(80) code!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(2000) description?: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) minAmount!: number;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) maxAmount!: number;
  @Raw() @IsInt() @Min(1) @Max(120) minTenureMonths!: number;
  @Raw() @IsInt() @Min(1) @Max(120) maxTenureMonths!: number;
  @Raw() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(999.9999) baseInterestRate!: number;
  @Raw() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(999.9999) processingFeeRate!: number;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(999.9999) insuranceRate?: number;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(999.9999) penaltyRate?: number;
}

export class UpdateLoanProductDto extends PartialType(OmitType(CreateLoanProductDto, ['code'] as const), { skipNullProperties: false }) {
  @Optional() @Raw() @IsBoolean() isActive?: boolean;
}

export class UpdateUserDto {
  @Optional() @Raw() @IsString() @MinLength(1) @MaxLength(80) firstName?: string;
  @Optional() @Raw() @IsString() @MinLength(1) @MaxLength(80) lastName?: string;
  @IsOptional() @Raw() @IsString() @Matches(/^\+?[1-9]\d{7,14}$/) phoneNumber?: string;
}
export class UpdateAdminDto {
  @Optional() @Raw() @IsString() @MinLength(1) @MaxLength(80) department?: string;
  @Optional() @Raw() @IsInt() @Min(0) @Max(2147483647) level?: number;
}
export class CreateRoleDto {
  @Raw() @IsString() @MinLength(1) @MaxLength(80) name!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(200) @ArrayUnique() @IsUUID('all', { each: true }) permissionIds?: string[];
}
export class CreateEligibilityRuleDto {
  @Raw() @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(100) key!: string;
  @IsEnum(RuleType) ruleType!: string;
  @IsEnum(Operator) operator!: string;
  @IsDefined() value!: unknown;
  @IsOptional() @Raw() @IsString() @MaxLength(2000) description?: string;
}
export class UpsertSettingDto {
  @IsDefined() value!: unknown;
  @Optional() @IsIn(['string', 'int', 'decimal', 'json', 'bool']) type?: string;
  @IsOptional() @Raw() @IsString() @MaxLength(2000) description?: string;
  @Optional() @Raw() @IsString() @MinLength(1) @MaxLength(100) scope?: string;
}
export class TransitionLoanDto {
  @IsEnum(LoanApplicationStatus) toState!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(500) reason?: string;
}
export class CreateDisbursementDto {
  @IsUUID() loanApplicationId!: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount!: number;
  @IsEnum(DisbursementMethod) method!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(80) beneficiaryBankName?: string;
  @IsOptional() @Raw() @IsString() @Matches(/^\d{9,18}$/) beneficiaryAccount?: string;
  @IsOptional() @Raw() @IsString() @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/) beneficiaryIfsc?: string;
}
export class UpdateDisbursementDto {
  @IsEnum(DisbursementStatus) status!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(80) providerReference?: string;
}
export class CreateRepaymentDto {
  @IsUUID() loanApplicationId!: string;
  @IsOptional() @IsUUID() scheduleId?: string;
  @IsOptional() @IsUUID() paymentId?: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount!: number;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) principalAllocated?: number;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) interestAllocated?: number;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) penaltyAllocated?: number;
}
export class UpdateScheduleDto {
  @IsEnum(RepaymentScheduleStatus) status!: string;
  @Optional() @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999.99) paidAmount?: number;
}
export class CreateAdminPaymentDto {
  @IsOptional() @IsUUID() loanApplicationId?: string;
  @IsEnum(PaymentMethod) method!: string;
  @IsEnum(PaymentType) type!: string;
  @IsEnum(PaymentDirection) direction!: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount!: number;
  @IsOptional() @Raw() @IsString() @MaxLength(80) gateway?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
export class UpdatePaymentDto {
  @IsEnum(PaymentStatus) status!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(500) refusalReason?: string;
}
export class CreateTransactionDto {
  @IsEnum(PaymentTransactionType) type!: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(9999999999.99) amount!: number;
  @IsEnum(PaymentDirection) direction!: string;
  @Optional() @Raw() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
}
export class CreateLedgerEntryDto {
  @IsUUID() ledgerId!: string;
  @IsEnum(LedgerEntryType) entryType!: string;
  @Raw() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(Number.MAX_SAFE_INTEGER / 100) amount!: number;
  @IsEnum(LedgerCategory) category!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @Raw() @IsString() @MaxLength(200) reference?: string;
  @Optional() @IsEnum(LedgerEntrySource) entrySource?: string;
  @Optional() @IsEnum(LedgerEntryDirection) direction?: string;
}
export class SendNotificationDto {
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @Raw() @IsString() @MaxLength(100) templateSlug?: string;
  @IsEnum(NotificationType) type!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(10000) body!: string;
  @Optional() @IsEnum(NotificationChannel) channel?: string;
  @IsOptional() @IsObject() data?: Record<string, unknown>;
  @IsOptional() @Raw() @IsString() @MaxLength(200) referenceId?: string;
}
export class CreateNotificationTemplateDto {
  @Raw() @IsString() @MinLength(1) @MaxLength(100) slug!: string;
  @IsEnum(NotificationChannel) channel!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(200) titleTemplate!: string;
  @Raw() @IsString() @MinLength(1) @MaxLength(10000) bodyTemplate!: string;
  @IsOptional() @Raw() @IsString() @MaxLength(200) subjectTemplate?: string;
}
