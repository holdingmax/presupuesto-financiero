-- CreateTable
CREATE TABLE "LineaPresupuestoDesglose" (
    "id" TEXT NOT NULL,
    "lineaPresupuestoId" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineaPresupuestoDesglose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineaPresupuestoDesglose_lineaPresupuestoId_idx" ON "LineaPresupuestoDesglose"("lineaPresupuestoId");

-- AddForeignKey
ALTER TABLE "LineaPresupuestoDesglose" ADD CONSTRAINT "LineaPresupuestoDesglose_lineaPresupuestoId_fkey" FOREIGN KEY ("lineaPresupuestoId") REFERENCES "LineaPresupuesto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
