-- AlterTable
ALTER TABLE `users` ADD COLUMN `show_activity` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `show_favorites` BOOLEAN NOT NULL DEFAULT true;
