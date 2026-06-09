-- CreateEnum
-- Note: StatementStatus enum is created implicitly by the ENUM column type in MySQL

-- CreateTable
CREATE TABLE `Statement` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `statementDate` VARCHAR(191) NOT NULL,
    `status` ENUM('GENERATED', 'APPROVED', 'REJECTED', 'SENDING', 'SENT') NOT NULL DEFAULT 'GENERATED',
    `filePath` VARCHAR(191) NULL,
    `fileName` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `sentAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `totalInvested` DECIMAL(14, 2) NOT NULL,
    `currentValue` DECIMAL(14, 2) NOT NULL,
    `totalDistributions` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Statement_status_periodStart_idx`(`status`, `periodStart`),
    INDEX `Statement_userId_periodStart_deletedAt_idx`(`userId`, `periodStart`, `deletedAt`),
    UNIQUE INDEX `Statement_userId_periodStart_key`(`userId`, `periodStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatementBanner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `buttonText` VARCHAR(191) NULL,
    `buttonUrl` VARCHAR(191) NULL,
    `gradientFrom` VARCHAR(191) NOT NULL DEFAULT '#1A2640',
    `gradientTo` VARCHAR(191) NOT NULL DEFAULT '#1A2640',
    `isArchived` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatementBannerAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `bannerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `StatementBannerAssignment_month_year_idx`(`month`, `year`),
    UNIQUE INDEX `StatementBannerAssignment_bannerId_userId_month_year_key`(`bannerId`, `userId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatementBannerPlacement` (
    `id` VARCHAR(191) NOT NULL,
    `statementId` VARCHAR(191) NOT NULL,
    `bannerId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `StatementBannerPlacement_statementId_bannerId_key`(`statementId`, `bannerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatementDisclosure` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Statement` ADD CONSTRAINT `Statement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Statement` ADD CONSTRAINT `Statement_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatementBannerAssignment` ADD CONSTRAINT `StatementBannerAssignment_bannerId_fkey` FOREIGN KEY (`bannerId`) REFERENCES `StatementBanner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatementBannerAssignment` ADD CONSTRAINT `StatementBannerAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatementBannerPlacement` ADD CONSTRAINT `StatementBannerPlacement_statementId_fkey` FOREIGN KEY (`statementId`) REFERENCES `Statement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatementBannerPlacement` ADD CONSTRAINT `StatementBannerPlacement_bannerId_fkey` FOREIGN KEY (`bannerId`) REFERENCES `StatementBanner`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
