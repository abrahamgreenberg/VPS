/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "Halacha" (
    "id" SERIAL NOT NULL,
    "heTitle" TEXT NOT NULL,
    "heText" TEXT NOT NULL,
    "enTitle" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Halacha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HalachaLine" (
    "id" SERIAL NOT NULL,
    "hebrew" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "halachaId" INTEGER NOT NULL,

    CONSTRAINT "HalachaLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Halacha_date_idx" ON "Halacha"("date");

-- CreateIndex
CREATE INDEX "HalachaLine_halachaId_idx" ON "HalachaLine"("halachaId");

-- AddForeignKey
ALTER TABLE "HalachaLine" ADD CONSTRAINT "HalachaLine_halachaId_fkey" FOREIGN KEY ("halachaId") REFERENCES "Halacha"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
