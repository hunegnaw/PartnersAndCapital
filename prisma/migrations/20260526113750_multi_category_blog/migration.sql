-- CreateTable
CREATE TABLE `BlogPostCategory` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,

    INDEX `BlogPostCategory_postId_idx`(`postId`),
    INDEX `BlogPostCategory_categoryId_idx`(`categoryId`),
    UNIQUE INDEX `BlogPostCategory_postId_categoryId_key`(`postId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Migrate existing categoryId data into junction table
INSERT INTO `BlogPostCategory` (`id`, `postId`, `categoryId`)
SELECT CONCAT('migrated_', `id`), `id`, `categoryId`
FROM `BlogPost`
WHERE `categoryId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `BlogPost` DROP FOREIGN KEY `BlogPost_categoryId_fkey`;

-- DropIndex
DROP INDEX `BlogPost_categoryId_idx` ON `BlogPost`;

-- AlterTable
ALTER TABLE `BlogPost` DROP COLUMN `categoryId`;

-- AddForeignKey
ALTER TABLE `BlogPostCategory` ADD CONSTRAINT `BlogPostCategory_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostCategory` ADD CONSTRAINT `BlogPostCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BlogCategory`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
