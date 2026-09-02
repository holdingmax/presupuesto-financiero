-- CreateTable
CREATE TABLE "MovimientoBancarioDesglose" (
    "id" TEXT NOT NULL,
    "movimientoId" TEXT NOT NULL,
    "unidadNegocio" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBancarioDesglose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MovimientoBancarioDesglose_movimientoId_idx" ON "MovimientoBancarioDesglose"("movimientoId");

-- AddForeignKey
ALTER TABLE "MovimientoBancarioDesglose" ADD CONSTRAINT "MovimientoBancarioDesglose_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "MovimientoBancario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
