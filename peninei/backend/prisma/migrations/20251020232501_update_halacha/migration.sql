/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `Halacha` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `url` to the `Halacha` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Halacha" ADD COLUMN     "url" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Halacha_url_key" ON "Halacha"("url");
