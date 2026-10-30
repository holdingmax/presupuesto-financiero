-- CreateEnum
CREATE TYPE "BloqueFilaExtra" AS ENUM ('INGRESOS', 'EGRESOS', 'ABAJO');

-- CreateTable
CREATE TABLE "FilaExtraReporte" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "bloque" "BloqueFilaExtra" NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreClave" TEXT NOT NULL,
    "desdePeriodo" TEXT NOT NULL,
    "hastaPeriodo" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilaExtraReporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FilaExtraReporte_empresaId_desdePeriodo_idx" ON "FilaExtraReporte"("empresaId", "desdePeriodo");

-- CreateIndex
CREATE UNIQUE INDEX "FilaExtraReporte_empresaId_nombreClave_key" ON "FilaExtraReporte"("empresaId", "nombreClave");

-- AddForeignKey
ALTER TABLE "FilaExtraReporte" ADD CONSTRAINT "FilaExtraReporte_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilaExtraReporte" ADD CONSTRAINT "FilaExtraReporte_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
