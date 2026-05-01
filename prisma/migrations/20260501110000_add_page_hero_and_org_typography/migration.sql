-- AlterTable
ALTER TABLE `Organization` ADD COLUMN `typography` JSON NULL;

-- AlterTable
ALTER TABLE `Page` ADD COLUMN `featuredImageUrl` VARCHAR(191) NULL;
