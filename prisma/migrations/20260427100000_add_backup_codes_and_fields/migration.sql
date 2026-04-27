-- AlterTable: Add metadata fields to Investment
ALTER TABLE `Investment` ADD COLUMN `location` VARCHAR(191) NULL,
    ADD COLUMN `targetHoldPeriod` VARCHAR(191) NULL,
    ADD COLUMN `distributionCadence` VARCHAR(191) NULL,
    ADD COLUMN `fundStatus` VARCHAR(191) NULL;

-- AlterTable: Add advisorType to Advisor
ALTER TABLE `Advisor` ADD COLUMN `advisorType` VARCHAR(191) NULL;

-- CreateTable: BackupCode for 2FA recovery
CREATE TABLE `BackupCode` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BackupCode_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BackupCode` ADD CONSTRAINT `BackupCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
