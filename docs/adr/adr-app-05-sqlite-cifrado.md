# ADR-APP-05 — expo-sqlite con SQLCipher como almacenamiento local canónico

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-5

## Contexto

Hoy el APK persiste todo en AsyncStorage sin cifrar (cola offline, caché, tema, trayectoria) y en
`expo-secure-store` (tokens). REQ-APK-021 exige cifrado de datos locales; la app oficial además
necesita datos relacionales locales (cache de entidades, sync por cursor, auditoría local) que en
JSON-en-AsyncStorage no escalan.

## Decisión

**expo-sqlite con SQLCipher** como almacenamiento local canónico:

- Config plugin `expo-sqlite` con `useSQLCipher: true` (Android/iOS). Requiere build propio (EAS);
  no funciona en Expo Go.
- Clave maestra aleatoria generada en primer uso, guardada en `expo-secure-store` con
  `requireAuthentication` (Keystore/Keychain) y usada como `PRAGMA key` al abrir cada conexión.
- Tablas: `cache_entidad`, `cola_evento`, `auditoria_local`, `sync_cursor` (+ esquema por módulo si
  se necesita).
- Migración de datos existentes de AsyncStorage vía `sqlcipher_export` (ATTACH + export) una sola
  vez, con verificación y borrado del origen.
- Tema/preferencias simples pueden quedarse en AsyncStorage (no son sensibles).

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Seguir con AsyncStorage + cifrado manual | Cifrado a mano de blobs JSON es frágil y sin garantías; no resuelve consultas relacionales |
| WatermelonDB / Realm | WatermelonDB está en mantenimiento mínimo; Realm (Atlas Device SDK) añade un motor pesado e incompatibilidades con New Architecture; expo-sqlite es primera parte de Expo y mantenida por ellos |
| SQLite sin cifrar | No cumple REQ-APK-021 ni el objetivo de seguridad de la app oficial |

## Consecuencias

**Positivas:** cumplimiento de REQ-APK-021, consultas reales para sync y búsqueda local, clave en
Keystore/Keychain, migración determinista y testeada.

**Negativas / lo que aceptamos pagar:** adiós a Expo Go para desarrollo de datos (se usa dev client,
que ya es el flujo del repo); cada conexión nueva debe aplicar `PRAGMA key` (incluye
`withExclusiveTransactionAsync`, que abre conexión propia).

**Qué haría que revisáramos esto:** si Expo retira SQLCipher o si aparecen requisitos de cifrado a
nivel de columna que SQLCipher no cubra.

## Impacto en el código

- `app.json` (config plugin), `src/data/db/**` (conexión, migraciones, repos) — HU-APP-06.
- Migración AsyncStorage→SQLite con test de ida y vuelta (HU-APP-06).
