/*
  Warnings:

  - A unique constraint covering the columns `[external_id]` on the table `sources` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `sources` ADD COLUMN `external_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `sources_external_id_key` ON `sources`(`external_id`);
