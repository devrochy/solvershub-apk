# ADR-APP-04 — Dos motores de datos: TanStack Query para lecturas admin + motor offline propio para campo

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-4

## Contexto

El APK tiene un motor offline maduro y probado: cola idempotente con UUID, dedupe y fusión
(`src/offline/cola.ts`), cache con TTL (`src/offline/cache.ts`), flush automático al reconectar y
ack por evento (`POST /sync-offline/eventos`). Ese motor es el diferencial del trabajo en campo
(REQ-APK-009..015). Los módulos nuevos del panel (conversaciones, comercio, calendario, …) necesitan
en cambio lecturas paginadas con caché, invalidación y reintentos, sin reinventar un caché a mano.

## Decisión

Conviven **dos motores** con responsabilidades claras:

1. **TanStack Query** para el server-state de los módulos admin/panel: caché con TTL, paginación,
   invalidación por mutación, reintentos con backoff. Configurado con `staleTime`/`gcTime`
   conservadores y soporte de `isOffline` (no refetch sin red; sirve del caché).
2. **Motor offline propio** (evolucionado del actual) para campo y escrituras críticas: cola de
   eventos idempotentes persistida en SQLite cifrado, sync incremental por cursor (HU-APP-15) y
   auditoría local. Toda escritura de cobranza de campo pasa por aquí, sin excepción.

Regla: las escrituras de módulos admin que se pueden hacer offline (cambio de estado de pedido,
estado de cita) se encolan por el motor propio; el resto de escrituras admin exige red y muestra
estado explícito de sin-conexión.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Solo TanStack Query con persistQueryClient | La persistencia genérica no entiende idempotencia ni ack por evento; perderíamos las garantías de campo probadas |
| Solo el motor propio para todo | Reimplementar paginación/invalidación a mano en 10 módulos; más código y peor consistencia |
| React Query + cola para todo (sin separación) | Mezcla responsabilidades: las mutaciones de campo se re-renderizan con cachés de admin y viceversa |

## Consecuencias

**Positivas:** cada módulo usa la herramienta justa; el motor de campo sigue intacto y testeado;
las pantallas nuevas heredan skeletons/errores/offline de TanStack Query.

**Negativas / lo que aceptamos pagar:** una dependencia nueva (TanStack Query); hay que educar a
los módulos para no mezclar motores en la misma pantalla.

**Qué haría que revisáramos esto:** si TanStack Query añade soporte de colas idempotentes
(mutaciones offline con ack), podríamos unificar el motor de escritura.

## Impacto en el código

- `src/core/query/` (client + helpers por módulo), `src/data/sync-engine/` (motor propio sobre
  SQLite) — HU-APP-01, HU-APP-15.
- `package.json`: `@tanstack/react-query`.
