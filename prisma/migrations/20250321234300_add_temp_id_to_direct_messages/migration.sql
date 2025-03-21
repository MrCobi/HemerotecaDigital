-- AlterTable
ALTER TABLE `direct_messages` ADD COLUMN `temp_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `direct_messages_temp_id_idx` ON `direct_messages`(`temp_id`);
