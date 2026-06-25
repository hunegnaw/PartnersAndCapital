-- AlterTable
ALTER TABLE `TwoFactorSecret` ADD COLUMN `smsCodeHash` VARCHAR(191) NULL,
    ADD COLUMN `smsCodeExpiresAt` DATETIME(3) NULL;
