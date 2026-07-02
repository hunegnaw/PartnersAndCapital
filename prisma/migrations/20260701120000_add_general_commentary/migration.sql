-- CreateTable
CREATE TABLE `StatementGeneralCommentary` (
    `id` VARCHAR(191) NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StatementGeneralCommentary_month_year_idx`(`month`, `year`),
    UNIQUE INDEX `StatementGeneralCommentary_month_year_key`(`month`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
