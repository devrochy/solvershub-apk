# `src/data`

Base local cifrada (expo-sqlite + SQLCipher), repos, sync-engine y auditoría local (ADR-APP-05).

- `db/conexion.ts`: apertura cifrada con clave maestra en SecureStore (`PRAGMA key`) + kill-switch local.
- `db/migraciones.ts`: esquema (`cache_entidad`, `cola_evento`, `auditoria_local`, `sync_cursor`).
- `repos/`: caché, cola offline idempotente y auditoría local (contrato usado por HU-APP-07/15).
- `migracion/desde-asyncstorage.ts`: traspaso único de la cola legacy con verificación de totales
  (se ACTIVA en HU-APP-07 junto al cambio de motor, nunca en el arranque genérico).
- `bootstrap.ts`: inicialización idempotente llamada desde `App.tsx`.

SQLCipher requiere build propio (EAS): en Expo Go la base abre SIN cifrado (solo desarrollo).

## Matriz offline (HU-APP-15)

| Módulo | Lectura offline | Escritura encolada | Solo con red |
|---|---|---|---|
| Cobranza (campo) | ✅ caché + trayecto diario | ✅ cola SQLite (`cola_evento`) con ack | liquidación PDF |
| Cobranza (admin) | `sync/{entidad}` en curso (engine listo) | — | acciones admin |
| Operación | pendiente de wire al engine | — | responder/resolver |
| Comercio | pendiente de wire al engine | cambio de estado de pedido (pendiente) | crear productos |
| Calendario | pendiente de wire al engine | mover/cancelar cita (pendiente) | crear/bloquear |
| Negocio/Configuración/Herramientas | — | — | ✅ siempre |

El motor (`src/data/sync-engine.ts`) aplica cursor por entidad, LWW por `updatedAt` y
`deletedIds`; el wire por módulo se activa cuando cada pantalla consuma la caché.
