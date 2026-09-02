# Tarea: apk-apertura-ruta (registrar apertura de la ruta del día)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 4b, 2026-09-01). HU-41. Requiere el backend `apertura-ruta-auditoria` (#85, ya mergeado).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que la APK registre la apertura de la ruta del día (`POST /cobrador/rutas/:rutaId/apertura`) al abrir la pantalla del día, para auditoría de la operación de campo (HU-41).

## Fuera de alcance
- Geolocalización automática del cobrador al abrir (las coords se envían vacías por ahora; el backend las acepta opcionales).
- Visualización de las aperturas (backend/panel).

## Bloques (checklist TDD)
- [x] Bloque 1: `cobradorApi.registrarApertura(rutaId, {latitud?, longitud?})` → POST `/cobrador/rutas/:rutaId/apertura`.
  - Test(s): `src/api/cobrador.test.ts` (+1).
- [x] Bloque 2: `DiaScreen` — llama `registrarApertura` al montar (fire-and-forget).
  - Test(s): `src/screens/DiaScreen.test.tsx` (+1).
- [x] Bloque 3: `scripts/check.sh` verde (136 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Se envía con `{}` (sin coords) al montar: es la apertura mínima. Si el cobrador ya inició GPS, se podría enriquecer luego.
- Fire-and-forget con `.catch(() => undefined)`: no bloquea la carga de la lista ni rompe en error de red (la apertura es auditoría, no crítica).

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (136 tests, 20 suites).
- Archivos modificados: `src/api/cobrador.ts` (+registrarApertura), `src/api/cobrador.test.ts` (+1), `src/screens/DiaScreen.tsx` (llamada al montar), `src/screens/DiaScreen.test.tsx` (+1 + default mock), `docs/ai/tasks/apk-apertura-ruta.md`.
- Pendientes/seguimiento: enviar coordenadas reales (cuando el cobrador abre el día con GPS activo).