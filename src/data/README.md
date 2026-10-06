# `src/data`

Base local cifrada (expo-sqlite + SQLCipher), repos, sync-engine y auditoría local (ADR-APP-05).

- `db/conexion.ts`: apertura cifrada con clave maestra en SecureStore (`PRAGMA key`) + kill-switch local.
- `db/migraciones.ts`: esquema (`cache_entidad`, `cola_evento`, `auditoria_local`, `sync_cursor`).
- `repos/`: caché, cola offline idempotente y auditoría local (contrato usado por HU-APP-07/15).
- `migracion/desde-asyncstorage.ts`: traspaso único de la cola legacy con verificación de totales
  (se ACTIVA en HU-APP-07 junto al cambio de motor, nunca en el arranque genérico).
- `bootstrap.ts`: inicialización idempotente llamada desde `App.tsx`.

SQLCipher requiere build propio (EAS): en Expo Go la base abre SIN cifrado (solo desarrollo).
