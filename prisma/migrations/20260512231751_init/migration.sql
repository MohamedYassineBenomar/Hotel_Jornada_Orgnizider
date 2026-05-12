-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('manager');

-- CreateEnum
CREATE TYPE "WorkerRole" AS ENUM ('camarero', 'ayudante_camarero', 'cocinero', 'ayudante_cocinero');

-- CreateEnum
CREATE TYPE "Zone" AS ENUM ('planta_0', 'terraza');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "Restaurant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "operatingHoursStart" INTEGER NOT NULL DEFAULT 360,
    "operatingHoursEnd" INTEGER NOT NULL DEFAULT 1440,
    "terraceSeasonMonths" INTEGER[] DEFAULT ARRAY[4, 5, 6, 7, 8, 9]::INTEGER[],
    "terraceHoursStart" INTEGER NOT NULL DEFAULT 660,
    "terraceHoursEnd" INTEGER NOT NULL DEFAULT 1380,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restaurant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'manager',
    "restaurantId" TEXT NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "qualifiedRoles" "WorkerRole"[],
    "maxWeeklyHours" INTEGER NOT NULL,
    "fixedDaysOff" INTEGER[],
    "annualVacationDays" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationBlock" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacationBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleWeek" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "scheduleWeekId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "zone" "Zone" NOT NULL,
    "role" "WorkerRole" NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "segmentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UncoveredSlot" (
    "id" TEXT NOT NULL,
    "scheduleWeekId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "zone" "Zone" NOT NULL,
    "requiredRole" "WorkerRole" NOT NULL,
    "reasonEs" TEXT NOT NULL,

    CONSTRAINT "UncoveredSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_restaurantId_idx" ON "User"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_idx" ON "AuthToken"("userId");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Worker_restaurantId_idx" ON "Worker"("restaurantId");

-- CreateIndex
CREATE INDEX "Worker_restaurantId_archivedAt_idx" ON "Worker"("restaurantId", "archivedAt");

-- CreateIndex
CREATE INDEX "VacationBlock_workerId_idx" ON "VacationBlock"("workerId");

-- CreateIndex
CREATE INDEX "VacationBlock_workerId_startDate_endDate_idx" ON "VacationBlock"("workerId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ScheduleWeek_restaurantId_status_idx" ON "ScheduleWeek"("restaurantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleWeek_restaurantId_isoYear_isoWeek_key" ON "ScheduleWeek"("restaurantId", "isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "Shift_scheduleWeekId_idx" ON "Shift"("scheduleWeekId");

-- CreateIndex
CREATE INDEX "Shift_workerId_date_idx" ON "Shift"("workerId", "date");

-- CreateIndex
CREATE INDEX "Shift_scheduleWeekId_date_idx" ON "Shift"("scheduleWeekId", "date");

-- CreateIndex
CREATE INDEX "Shift_segmentGroupId_idx" ON "Shift"("segmentGroupId");

-- CreateIndex
CREATE INDEX "UncoveredSlot_scheduleWeekId_idx" ON "UncoveredSlot"("scheduleWeekId");

-- CreateIndex
CREATE INDEX "UncoveredSlot_scheduleWeekId_date_idx" ON "UncoveredSlot"("scheduleWeekId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationBlock" ADD CONSTRAINT "VacationBlock_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWeek" ADD CONSTRAINT "ScheduleWeek_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleWeek" ADD CONSTRAINT "ScheduleWeek_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_scheduleWeekId_fkey" FOREIGN KEY ("scheduleWeekId") REFERENCES "ScheduleWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UncoveredSlot" ADD CONSTRAINT "UncoveredSlot_scheduleWeekId_fkey" FOREIGN KEY ("scheduleWeekId") REFERENCES "ScheduleWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;
