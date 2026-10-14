-- CreateEnum
CREATE TYPE "ColumnaReporte" AS ENUM ('PRESUPUESTADO', 'REAL');

-- CreateTable
CREATE TABLE "ValorManualReporte" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "filaClave" TEXT NOT NULL,
    "columna" "ColumnaReporte" NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "nota" TEXT,
    "cargadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValorManualReporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ValorManualReporte_empresaId_periodo_filaClave_columna_key" ON "ValorManualReporte"("empresaId", "periodo", "filaClave", "columna");

-- AddForeignKey
ALTER TABLE "ValorManualReporte" ADD CONSTRAINT "ValorManualReporte_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorManualReporte" ADD CONSTRAINT "ValorManualReporte_cargadoPorId_fkey" FOREIGN KEY ("cargadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
