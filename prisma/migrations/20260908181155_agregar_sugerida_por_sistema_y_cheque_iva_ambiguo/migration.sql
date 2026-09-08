-- AlterTable
ALTER TABLE "MovimientoBancario" ADD COLUMN     "chequeIvaAmbiguo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sugeridaPorSistema" BOOLEAN NOT NULL DEFAULT false;
