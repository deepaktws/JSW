-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "createdBy" SET DEFAULT '00000000-0000-0000-0000-000000000000',
ALTER COLUMN "updatedBy" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- CreateTable
CREATE TABLE "File" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "originalName" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "File_userId_idx" ON "File"("userId");

-- CreateIndex
CREATE INDEX "File_status_idx" ON "File"("status");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
