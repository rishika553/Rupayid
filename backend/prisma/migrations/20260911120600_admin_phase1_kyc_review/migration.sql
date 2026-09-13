-- CreateEnum
CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN     "password_hash" TEXT,
ADD COLUMN     "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "username" TEXT;

-- AlterTable
ALTER TABLE "kyc_applications" ADD COLUMN     "decline_reason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");
