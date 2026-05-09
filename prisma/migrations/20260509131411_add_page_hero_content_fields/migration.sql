-- AlterTable
ALTER TABLE `Page` ADD COLUMN `heroDescription` TEXT NULL,
    ADD COLUMN `heroShowDivider` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `heroShowGrid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `heroSubtitle` TEXT NULL,
    ADD COLUMN `heroTagline` VARCHAR(191) NULL;
