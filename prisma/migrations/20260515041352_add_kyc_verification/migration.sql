-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'NOT_STARTED',
    `legalFirstName` VARCHAR(191) NULL,
    `legalLastName` VARCHAR(191) NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `country` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `zipCode` VARCHAR(191) NULL,
    `idDocumentType` VARCHAR(191) NULL,
    `idDocumentPath` VARCHAR(191) NULL,
    `idDocumentName` VARCHAR(191) NULL,
    `accreditationBasis` ENUM('INCOME_INDIVIDUAL', 'INCOME_JOINT', 'NET_WORTH', 'PROFESSIONAL_LICENSE', 'ENTITY_INVESTOR') NULL,
    `accreditationDocType` VARCHAR(191) NULL,
    `accreditationDocPath` VARCHAR(191) NULL,
    `accreditationDocName` VARCHAR(191) NULL,
    `consentAccuracy` BOOLEAN NOT NULL DEFAULT false,
    `consentDataHandling` BOOLEAN NOT NULL DEFAULT false,
    `consentScreening` BOOLEAN NOT NULL DEFAULT false,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `rejectionReason` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Verification_userId_key`(`userId`),
    INDEX `Verification_status_idx`(`status`),
    INDEX `Verification_submittedAt_idx`(`submittedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Verification` ADD CONSTRAINT `Verification_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
