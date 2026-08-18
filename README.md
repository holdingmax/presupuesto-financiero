# Presupuesto y Ejecución Financiera

Herramienta independiente (accedida a través de Toolbox, pero sin dependencias
de esa infraestructura) para automatizar el proceso de presupuesto financiero
y ejecución semanal que hoy hacen Ricci y Macchi a mano.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma ORM
- PostgreSQL en Neon
- Pensado para desplegar en Render

## Estado actual

Scaffold inicial + modelo de datos (`prisma/schema.prisma`), validado con Leticia.
Todavía NO hay UI ni lógica de negocio — es el punto de partida antes de:

1. Juntar todas las hojas de "detalle" de los gerentes (Patricia, Damián,
   Oscar, Lucas, Mariela, etc.) para poder generalizar el formulario de carga.
2. Confirmar cómo le llega la información a Ricci (flujo separado de Macchi).
3. Incorporar la última media hora de la reunión del 7/8/2026 (pendiente de
   desgrabar).
4. Terminar de entender la fórmula que arrastra el saldo bancario de un mes
   al siguiente (celda U-39 en el archivo de ejemplo de Vigo).
5. Definir cómo se modela el prorrateo de "Expensas" entre unidades de
   negocio (no está en el esquema todavía — falta la regla exacta).

## Modelo de datos

Ver `prisma/schema.prisma`. Resumen de entidades:

- **Empresa**: empresa o unidad de negocio. El CUIT es un atributo (no una
  clave) porque un CUIT puede corresponder a más de una unidad de negocio
  (ej. CREAR = Fredy + Mantenor), y una unidad puede tener varios CUIT
  (ej. Fredy).
- **Usuario** / **UsuarioEmpresa**: permisos por empresa. Un admin no
  necesita filas — ve todo (se resuelve en la capa de autorización, no en
  la tabla de permisos).
- **PresupuestoMensual**: por empresa y período (`YYYY-MM`). Estado
  `ABIERTO` / `VALIDADO`. Una vez validado, no se edita retroactivamente.
- **LineaPresupuesto**: el detalle cargado por el gerente (Detalle +
  Importe + Clasificación). Importe no puede ser 0 ni vacío. Clasificación
  no puede estar vacía.
- **EjecucionSemanal**: la ejecución de una semana dentro de un
  presupuesto. Estado `ABIERTA` / `CERRADA`, misma regla de no-retroactividad.
- **MovimientoBancario**: cada línea de extracto bancario ya imputada
  (clasificada y asignada a una unidad de negocio) vía el panel de
  imputación.
- **Adjunto**: comprobante/imagen de respaldo, puede colgar de una línea de
  presupuesto o de un movimiento bancario.

## Primeros pasos para correr localmente

```bash
npm install
cp .env.example .env   # completar DATABASE_URL con la cadena de Neon
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

> Nota: en el entorno donde se generó este scaffold la red estaba
> restringida y no se pudo descargar el motor de Prisma
> (`binaries.prisma.sh`), así que `prisma generate` / `migrate` no se
> corrieron acá. Deberían funcionar sin problema en tu máquina o en el
> pipeline de CI/CD.

## Plan de trabajo (según lo pedido por Vigo)

1. Base de datos primero, todo en modo prueba.
2. Arrancar con el presupuesto de una sola empresa ya cerrado (pedírselo a
   Macchi) y cargarlo al sistema.
3. Macchi corre la ejecución en paralelo (sistema viejo + sistema nuevo)
   para comparar.
4. Cuando esté probado, pasar a producción — arrancando con el Presupuesto
   Financiero de septiembre 2026.
