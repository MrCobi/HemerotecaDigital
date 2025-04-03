-- AlterTable
ALTER TABLE `conversation_participants` ADD COLUMN `is_muted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `nickname` VARCHAR(191) NULL,
    ADD COLUMN `role` ENUM('member', 'admin', 'moderator', 'owner') NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE `conversations` ADD COLUMN `creator_id` VARCHAR(191) NULL,
    ADD COLUMN `description` TEXT NULL;

-- AlterTable
ALTER TABLE `direct_messages` ADD COLUMN `reply_to_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `password` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `group_settings` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `only_admins_can_invite` BOOLEAN NOT NULL DEFAULT false,
    `only_admins_can_message` BOOLEAN NOT NULL DEFAULT false,
    `only_admins_can_edit` BOOLEAN NOT NULL DEFAULT false,
    `is_private` BOOLEAN NOT NULL DEFAULT false,
    `max_participants` INTEGER NULL,

    UNIQUE INDEX `group_settings_conversation_id_key`(`conversation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_reads` (
    `id` VARCHAR(191) NOT NULL,
    `message_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `read_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `message_reads_message_id_idx`(`message_id`),
    INDEX `message_reads_user_id_idx`(`user_id`),
    UNIQUE INDEX `message_reads_message_id_user_id_key`(`message_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `conversation_id` VARCHAR(191) NOT NULL,
    `inviter_id` VARCHAR(191) NOT NULL,
    `invitee_id` VARCHAR(191) NOT NULL,
    `status` ENUM('pending', 'accepted', 'rejected', 'expired') NOT NULL DEFAULT 'pending',
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `group_invitations_conversation_id_idx`(`conversation_id`),
    INDEX `group_invitations_inviter_id_idx`(`inviter_id`),
    INDEX `group_invitations_invitee_id_idx`(`invitee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `direct_messages_reply_to_id_idx` ON `direct_messages`(`reply_to_id`);

-- AddForeignKey
ALTER TABLE `group_settings` ADD CONSTRAINT `group_settings_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `direct_messages` ADD CONSTRAINT `direct_messages_reply_to_id_fkey` FOREIGN KEY (`reply_to_id`) REFERENCES `direct_messages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `direct_messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_reads` ADD CONSTRAINT `message_reads_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_invitations` ADD CONSTRAINT `group_invitations_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_invitations` ADD CONSTRAINT `group_invitations_inviter_id_fkey` FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_invitations` ADD CONSTRAINT `group_invitations_invitee_id_fkey` FOREIGN KEY (`invitee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
