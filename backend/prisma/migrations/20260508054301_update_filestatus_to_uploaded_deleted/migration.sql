-- Drop default first
ALTER TABLE "File" ALTER COLUMN "status" DROP DEFAULT;

-- Convert column to text temporarily
ALTER TABLE "File" ALTER COLUMN "status" TYPE text;

-- Drop old enum
DROP TYPE "FileStatus";

-- Create new enum with all 3 values
CREATE TYPE "FileStatus" AS ENUM ('ACTIVE', 'UPLOADED', 'DELETED');

-- Convert back to enum
ALTER TABLE "File" ALTER COLUMN "status" TYPE "FileStatus" USING "status"::"FileStatus";

-- Update ACTIVE to UPLOADED
UPDATE "File" SET "status" = 'UPLOADED' WHERE "status" = 'ACTIVE';

-- Now recreate enum with only 2 values
ALTER TABLE "File" ALTER COLUMN "status" TYPE text;
DROP TYPE "FileStatus";
CREATE TYPE "FileStatus" AS ENUM ('UPLOADED', 'DELETED');
ALTER TABLE "File" ALTER COLUMN "status" TYPE "FileStatus" USING "status"::"FileStatus";
ALTER TABLE "File" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';