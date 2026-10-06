# HU-APP-06 · Almacenamiento local cifrado (app)

## Resultado

Capa de datos en `src/data/` con expo-sqlite + SQLCipher y repos listos para el motor nuevo.

### Qué se agregó

- `db/conexion.ts`: apertura cifrada (`openDatabaseAsync` + `PRAGMA key` con clave maestra de 32
  bytes generada en SecureStore), kill-switch local (`solvershub_sqlite_apagada`) con
  `apagarBase`/`reactivarBase`.
- `db/executor.ts`: `SqlExecutor` (run/getAll/getFirst/exec) con impl real de expo-sqlite y
  fake en memoria para tests (`src/data/testing/fake-sqlite.ts`).
- `db/migraciones.ts`: esquema `cache_entidad`, `cola_evento`, `auditoria_local`, `sync_cursor`
  (idempotente).
- `repos/`: `cache.ts` (guardar/leer/borrar/limpiar con upsert), `cola.ts` (encolado idempotente,
  pendientes, estados, intentos, totales), `auditoria-local.ts` (registro + pendientes +
  sincronizadas).
- `migracion/desde-asyncstorage.ts`: traspaso único de la cola legacy (`cobranza_cola_offline`) a
  `cola_evento` con verificación de totales, borrado del origen y marca en SecureStore.
- `bootstrap.ts` + arranque en `App.tsx` (un fallo no bloquea la app).
- `app.json`: config plugin `expo-sqlite` con `useSQLCipher: true` (requiere build propio; en
  Expo Go la base abre sin cifrar — solo desarrollo).
- 5 tests nuevos (esquema, caché, cola, auditoría, migración con verificación).

## Decisión de despliegue (documentada en el ADR)

La migración de la cola legacy **NO corre en el arranque** de esta HU: migrar la cola antes de
que el motor cambie dejaría a la app sin eventos pendientes (el flujo legacy sigue leyendo
AsyncStorage). Se activa en HU-APP-07 junto al cambio de motor, con la estrategia del
`design.md`: "leer AsyncStorage si SQLite no tiene la entidad" durante una versión y el
kill-switch local como reversa.

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **552/552 tests**.
- SQLCipher verificado en doc de expo-sqlite (config plugin `useSQLCipher` → gradle.properties);
  la verificación de archivo ilegible sin clave queda para el dev client (build EAS).
