-- AlterTable
ALTER TABLE `Verification` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Verification_deletedAt_idx` ON `Verification`(`deletedAt`);

