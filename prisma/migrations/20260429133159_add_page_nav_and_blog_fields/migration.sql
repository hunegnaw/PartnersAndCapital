-- AlterTable
ALTER TABLE `Page` ADD COLUMN `isBlogPage` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `navLabel` VARCHAR(191) NULL,
    ADD COLUMN `navOrder` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `showInNav` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `Page_showInNav_idx` ON `Page`(`showInNav`);

-- CreateIndex
CREATE INDEX `Page_isBlogPage_idx` ON `Page`(`isBlogPage`);
