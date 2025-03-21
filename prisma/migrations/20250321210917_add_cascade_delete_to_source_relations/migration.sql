-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_source_id_fkey`;

-- DropForeignKey
ALTER TABLE `favorite_sources` DROP FOREIGN KEY `favorite_sources_source_id_fkey`;

-- DropForeignKey
ALTER TABLE `ratings` DROP FOREIGN KEY `ratings_source_id_fkey`;

-- AddForeignKey
ALTER TABLE `favorite_sources` ADD CONSTRAINT `favorite_sources_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ratings` ADD CONSTRAINT `ratings_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_source_id_fkey` FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
