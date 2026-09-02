# Tarea: apk-registrar-prestamo (registrar préstamo desde la APK)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 3a, 2026-09-01). HU-14 (docs/APP_REQUIREMENTS.md:57). Requiere el endpoint backend `cobrador-prestamos` (#82, ya mergeado).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el cobrador registre un préstamo a un cliente desde la APK (valor, cuotas, días entre cuotas, tipo de interés opcional) llamando `POST /cobrador/rutas/:rutaId/prestamos` (HU-14).

## Fuera de alcance
- Fiador (campos disponibles en el backend/API, sin UI por ahora).
- Fotos facial/documento al crear préstamo (las maneja el alta de cliente).
- Validaciones de cupo/tope deuda (las aplica el backend, los errores se muestran al cobrador).

## Bloques (checklist TDD)
- [x] Bloque 1: `cobradorApi.crearPrestamo(rutaId, input)` → `POST /cobrador/rutas/:rutaId/prestamos` + tipo `RegistrarPrestamoInput`.
  - Test(s): `src/api/cobrador.test.ts` (+1).
- [x] Bloque 2: helper `validarPrestamo(campos)` — valor > 0, cuotas ≥ 1, días ≥ 1, interés opcional > 0.
  - Test(s): `src/features/prestamo/registrar-prestamo.test.ts` (5).
- [x] Bloque 3: UI en `ClienteScreen` — botón "Nuevo préstamo" + formulario que llama `crearPrestamo` y recarga el cliente.
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+2).
- [x] Bloque 4: `scripts/check.sh` verde (128 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- El formulario se aloja en `ClienteScreen` (necesita `clienteId` de la ruta; el préstamo es por cliente).
- Se recarga el cliente tras registrar para reflejar el nuevo préstamo en el estado de cuenta.
- El backend ya valida cupo/tope/`ruta_config`; los errores HTTP se muestran como mensaje.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (128 tests, 20 suites).
- Archivos modificados: `src/api/cobrador.ts` (+crearPrestamo), `src/api/cobrador.test.ts` (+1), `src/types/cobrador.ts` (+RegistrarPrestamoInput), `src/features/prestamo/registrar-prestamo.ts` (+test), `src/screens/ClienteScreen.tsx` (botón + formulario), `src/screens/ClienteScreen.test.tsx` (+2), `docs/ai/tasks/apk-registrar-prestamo.md`.
- Pendientes/seguimiento: fiador y fotos en el alta quedan fuera; se pueden agregar luego a la misma pantalla.