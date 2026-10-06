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
| Cobranza (admin) | ✅ sync por cursor (activo vía SincronizadorProvider) | — | acciones admin |
| Operación | ✅ sync + caché (hidratación pendiente en listas) | — | responder/resolver |
| Comercio | ✅ sync + caché | ✅ cambio de estado de pedido (encolado + despachador) | crear productos |
| Calendario | ✅ sync + caché | mover/cancelar cita (pendiente) | crear/bloquear |
| Negocio/Configuración/Herramientas | — | — | ✅ siempre |

**Wire activo (HU-APP-15)**: `SincronizadorProvider` (App) dispara `sincronizarTodo` con
sesión admin + red (y al reconectar); escrituras encoladas con despachadores por módulo
(`src/data/escrituras.ts`); búsqueda local sobre caché sin red (`src/data/busqueda-cache.ts`).
