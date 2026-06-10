-- CreateTable
CREATE TABLE `StatementCommentary` (
    `id` VARCHAR(191) NOT NULL,
    `investmentId` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatementCommentary_month_year_idx`(`month`, `year`),
    UNIQUE INDEX `StatementCommentary_investmentId_month_year_key`(`investmentId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatementUpcomingDistribution` (
    `id` VARCHAR(191) NOT NULL,
    `investmentId` VARCHAR(191) NOT NULL,
    `expectedDate` DATETIME(3) NOT NULL,
    `amount` DECIMAL(14, 2) NULL,
    `description` VARCHAR(191) NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatementUpcomingDistribution_investmentId_month_year_idx`(`investmentId`, `month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `StatementCommentary` ADD CONSTRAINT `StatementCommentary_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatementUpcomingDistribution` ADD CONSTRAINT `StatementUpcomingDistribution_investmentId_fkey` FOREIGN KEY (`investmentId`) REFERENCES `Investment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
