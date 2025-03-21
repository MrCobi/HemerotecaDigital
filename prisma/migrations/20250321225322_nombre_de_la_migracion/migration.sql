/*
  Warnings:

  - You are about to drop the column `user_name` on the `activity_history` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `activity_history` DROP COLUMN `user_name`,
    ADD COLUMN `details` TEXT NULL,
    ADD COLUMN `source_id` VARCHAR(191) NULL,
    ADD COLUMN `target_id` VARCHAR(191) NULL,
    ADD COLUMN `target_name` VARCHAR(191) NULL,
    ADD COLUMN `target_type` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `activity_history_source_id_idx` ON `activity_history`(`source_id`);

-- AddForeignKey
ALTER TABLE `activity_history` ADD CONSTRAINT `activity_history_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
