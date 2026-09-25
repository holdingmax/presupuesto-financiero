-- AlterEnum
ALTER TYPE "EstadoPresupuesto" ADD VALUE 'EN_REVISION';

-- AlterTable
ALTER TABLE "PresupuestoMensual" ADD COLUMN     "fueModificadoPorRevisor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "revisionCompletada" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UsuarioEmpresa" ADD COLUMN     "puedeRevisarPresupuesto" BOOLEAN NOT NULL DEFAULT false;
