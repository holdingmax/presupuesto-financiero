-- CreateTable
CREATE TABLE "PagoReferencia" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "proveedor" TEXT NOT NULL,
    "leyenda" TEXT NOT NULL,
    "unidadNegocio" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "esLiquidacionFinal" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoReferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PagoReferencia_fecha_importe_idx" ON "PagoReferencia"("fecha", "importe");
