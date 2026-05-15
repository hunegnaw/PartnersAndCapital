-- AlterTable
ALTER TABLE `ActivityFeed` ADD COLUMN `showAsBanner` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `ActivityFeed_showAsBanner_idx` ON `ActivityFeed`(`showAsBanner`);
