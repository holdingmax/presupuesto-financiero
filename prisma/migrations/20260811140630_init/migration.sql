-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'GERENTE', 'FINANZAS');

-- CreateEnum
CREATE TYPE "EstadoPresupuesto" AS ENUM ('ABIERTO', 'VALIDADO');

-- CreateEnum
CREATE TYPE "EstadoEjecucion" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cuit" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'GERENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioEmpresa" (
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,

    CONSTRAINT "UsuarioEmpresa_pkey" PRIMARY KEY ("usuarioId","empresaId")
);

-- CreateTable
CREATE TABLE "PresupuestoMensual" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoPresupuesto" NOT NULL DEFAULT 'ABIERTO',
    "fechaValidacion" TIMESTAMP(3),
    "validadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PresupuestoMensual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineaPresupuesto" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "clasificacion" TEXT NOT NULL,
    "clasificacion2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LineaPresupuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EjecucionSemanal" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "numeroSemana" INTEGER NOT NULL,
    "estado" "EstadoEjecucion" NOT NULL DEFAULT 'ABIERTA',
    "fechaCierre" TIMESTAMP(3),
    "cerradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EjecucionSemanal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoBancario" (
    "id" TEXT NOT NULL,
    "ejecucionId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nroReferencia" TEXT,
    "causal" TEXT,
    "concepto" TEXT NOT NULL,
    "importe" DECIMAL(18,2) NOT NULL,
    "saldo" DECIMAL(18,2),
    "bancoYCuenta" TEXT NOT NULL,
    "clasificacion" TEXT NOT NULL,
    "clasificacion2" TEXT,
    "unidadNegocio" TEXT NOT NULL,
    "detalle" TEXT,
    "detalle2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoBancario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adjunto" (
    "id" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "lineaPresupuestoId" TEXT,
    "movimientoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Empresa_cuit_idx" ON "Empresa"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PresupuestoMensual_empresaId_periodo_key" ON "PresupuestoMensual"("empresaId", "periodo");

-- CreateIndex
CREATE INDEX "LineaPresupuesto_presupuestoId_idx" ON "LineaPresupuesto"("presupuestoId");

-- CreateIndex
CREATE UNIQUE INDEX "EjecucionSemanal_presupuestoId_numeroSemana_key" ON "EjecucionSemanal"("presupuestoId", "numeroSemana");

-- CreateIndex
CREATE INDEX "MovimientoBancario_ejecucionId_idx" ON "MovimientoBancario"("ejecucionId");

-- CreateIndex
CREATE INDEX "MovimientoBancario_unidadNegocio_idx" ON "MovimientoBancario"("unidadNegocio");

-- CreateIndex
CREATE INDEX "MovimientoBancario_clasificacion_idx" ON "MovimientoBancario"("clasificacion");

-- AddForeignKey
ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioEmpresa" ADD CONSTRAINT "UsuarioEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresupuestoMensual" ADD CONSTRAINT "PresupuestoMensual_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineaPresupuesto" ADD CONSTRAINT "LineaPresupuesto_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoMensual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EjecucionSemanal" ADD CONSTRAINT "EjecucionSemanal_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoMensual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoBancario" ADD CONSTRAINT "MovimientoBancario_ejecucionId_fkey" FOREIGN KEY ("ejecucionId") REFERENCES "EjecucionSemanal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_lineaPresupuestoId_fkey" FOREIGN KEY ("lineaPresupuestoId") REFERENCES "LineaPresupuesto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "MovimientoBancario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
