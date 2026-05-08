-- CreateTable
CREATE TABLE `InvestmentValuation` (
    `id` VARCHAR(191) NOT NULL,
    `investmentId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `totalValue` DECIMAL(14, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `InvestmentValuation_investmentId_idx`(`investmentId`),
    INDEX `InvestmentValuation_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `InvestmentValuation_investmentId_date_key`(`investmentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvestmentValuation` ADD CONSTRAINT `InvestmentValuation_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InvestmentValuation` ADD CONSTRAINT `InvestmentValuation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
