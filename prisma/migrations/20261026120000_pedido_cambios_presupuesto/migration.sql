-- CreateTable
CREATE TABLE "PedidoCambiosPresupuesto" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "solicitadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PedidoCambiosPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PedidoCambiosPresupuesto_presupuestoId_createdAt_idx" ON "PedidoCambiosPresupuesto"("presupuestoId", "createdAt");

-- AddForeignKey
ALTER TABLE "PedidoCambiosPresupuesto" ADD CONSTRAINT "PedidoCambiosPresupuesto_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoMensual"("id") ON DELETE CASCADE ON UPDATE CASCADE;
