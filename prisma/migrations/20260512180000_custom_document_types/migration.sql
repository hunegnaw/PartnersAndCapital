-- CreateTable
CREATE TABLE `DocumentType` (
    `id` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DocumentType_value_key`(`value`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: Convert Document.type from ENUM to VARCHAR
-- MySQL ENUM→VARCHAR preserves existing string values
ALTER TABLE `Document` MODIFY COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'OTHER';
