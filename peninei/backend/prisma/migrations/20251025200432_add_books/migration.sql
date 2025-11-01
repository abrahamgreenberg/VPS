-- AlterTable
ALTER TABLE "Halacha" ADD COLUMN     "bookId" INTEGER;

-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_title_key" ON "Book"("title");

-- AddForeignKey
ALTER TABLE "Halacha" ADD CONSTRAINT "Halacha_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE SET NULL ON UPDATE CASCADE;
