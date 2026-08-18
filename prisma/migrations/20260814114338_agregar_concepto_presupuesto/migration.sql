/*
  Warnings:

  - Added the required column `concepto` to the `LineaPresupuesto` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LineaPresupuesto" ADD COLUMN     "concepto" TEXT NOT NULL;
