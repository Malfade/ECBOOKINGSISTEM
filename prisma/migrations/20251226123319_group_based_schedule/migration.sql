/*
  Warnings:

  - You are about to drop the column `roomId` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `timeEnd` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `timeStart` on the `lessons` table. All the data in the column will be lost.
  - You are about to drop the column `schedule` on the `rooms` table. All the data in the column will be lost.
  - Added the required column `group_id` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_id` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_end` to the `lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `time_start` to the `lessons` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "lessons" DROP CONSTRAINT "lessons_roomId_fkey";

-- AlterTable
ALTER TABLE "lessons" DROP COLUMN "roomId",
DROP COLUMN "timeEnd",
DROP COLUMN "timeStart",
ADD COLUMN     "group_id" TEXT NOT NULL,
ADD COLUMN     "room_id" TEXT NOT NULL,
ADD COLUMN     "time_end" TEXT NOT NULL,
ADD COLUMN     "time_start" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "schedule";

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "course" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
