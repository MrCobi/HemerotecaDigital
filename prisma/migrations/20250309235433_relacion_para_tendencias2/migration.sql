/*
  Warnings:

  - You are about to drop the column `external_id` on the `sources` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[url]` on the table `sources` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `sources_external_id_key` ON `sources`;

-- AlterTable
ALTER TABLE `sources` DROP COLUMN `external_id`;

-- CreateIndex
CREATE UNIQUE INDEX `sources_url_key` ON `sources`(`url`);
