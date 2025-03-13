-- DropForeignKey
ALTER TABLE `direct_messages` DROP FOREIGN KEY `direct_messages_receiver_id_fkey`;

-- DropForeignKey
ALTER TABLE `direct_messages` DROP FOREIGN KEY `direct_messages_sender_id_fkey`;

-- AddForeignKey
ALTER TABLE `direct_messages` ADD CONSTRAINT `direct_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direct_messages` ADD CONSTRAINT `direct_messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
