# Tarea: apk-seguridad-jwt-web (tokens solo en memoria en la build web)

- **Origen:** Fase C del plan de la APK (seguridad) aprobado por el usuario 2026-09-01. Ítem de backlog "JWT en localStorage (web)" detectado por code-reviewer en Fase A.
- **Estado:** completada
- **Fecha inicio:** 2026-09-01

## Objetivo
Eliminar la exposición del JWT (access + refresh) a XSS en la **build web** de la APK. Hoy `token-store.ts` cae a `localStorage` cuando no hay secure-store (web). La mitigación elegida con el usuario: **los tokens viven solo en memoria** en web (nunca en `localStorage`); en iOS/Android se mantiene `expo-secure-store`. Al recargar la página en web hay que volver a iniciar sesión (tradeoff aceptado).

## Fuera de alcance
- La build nativa (Android APK / iOS): sigue usando `expo-secure-store` sin cambios.
- El refresh-on-401 del proxy del panel (no aplica a la APK).

## Bloques (checklist TDD)
- [x] Bloque 1: `token-store.ts` — en web, `getItem`/`setItem`/`deleteItem` usan un store en memoria (Map de módulo); eliminar el fallback a `localStorage`.
  - Test(s): `src/session/token-store.test.ts` — los casos web se reescriben: la sesión NO toca `localStorage` (assert de que no se escribió), `readSession`/`clearSession` funcionan dentro de la misma sesión en memoria.
- [x] Bloque 2: `scripts/check.sh` verde + commit/PR.

## Decisiones tomadas durante la implementación
- Detección de web: `Platform.OS === "web"` (no depender de la presencia de `localStorage`).
- El store en memoria es un `Map` a nivel de módulo (nueva sesión al recargar la página).
- El perfil del cobrador también vive en memoria en web (no persistir nada sensible).

## Ambigüedades resueltas con el usuario
- Mitigación: tokens solo en memoria en web (opción recomendada) — se pierde la sesión al recargar la página.

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (85 tests, 16 suites).
- Archivos modificados: `src/session/token-store.ts` (store en memoria en web vía `Platform.OS === "web"`), `src/session/token-store.test.ts` (4 tests web reescritos: no escribe en `localStorage`, memoria por sesión, clear, perfil), `docs/ai/tasks/apk-seguridad-jwt-web.md` (este archivo), `docs/ai/tasks/backlog.md`.
- Pendientes/seguimiento: la build web pierde la sesión al recargar (tradeoff aceptado por el usuario); la build nativa sigue con `expo-secure-store` sin cambios.