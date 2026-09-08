-- CreateTable
CREATE TABLE "ChequeIvaReferencia" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "empresa" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "numeroCheque" INTEGER NOT NULL,
    "banco" TEXT NOT NULL,
    "importeCh" DECIMAL(18,2) NOT NULL,
    "comision" DECIMAL(6,4),
    "aIngresar" DECIMAL(18,2),
    "duplicadoAmbiguo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChequeIvaReferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChequeIvaReferencia_numeroCheque_importeCh_idx" ON "ChequeIvaReferencia"("numeroCheque", "importeCh");
