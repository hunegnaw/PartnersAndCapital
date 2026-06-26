-- AlterTable
ALTER TABLE `StatementDisclosure`
    ADD COLUMN `showOnStatements` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `showOnEmails` BOOLEAN NOT NULL DEFAULT false;
