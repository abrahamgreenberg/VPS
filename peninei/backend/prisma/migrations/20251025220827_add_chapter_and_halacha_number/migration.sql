/*
  Warnings:

  - Added the required column `bookTitle` to the `Halacha` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Halacha" ADD COLUMN     "bookTitle" TEXT NOT NULL,
ADD COLUMN     "chapterNumber" INTEGER,
ADD COLUMN     "halachaNumber" INTEGER;
