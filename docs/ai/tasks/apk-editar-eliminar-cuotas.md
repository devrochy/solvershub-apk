# Tarea: apk-editar-eliminar-cuotas (editar/eliminar cuotas desde la APK)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 3b, 2026-09-01). HU-48 (docs/APP_REQUIREMENTS.md:65). Requiere el endpoint backend `cobrador-cuotas-abonos` (#83, ya mergeado).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el cobrador edite el valor de una cuota o la elimine desde la APK, con re-autenticación (contraseña) y motivo obligatorio (HU-48), llamando `PATCH/DELETE /cobrador/rutas/:rutaId/cuotas/:cuotaId`.

## Fuera de alcance
- Eliminar abonos desde la APK (el API `eliminarAbono` ya está en `cobradorApi`, sin UI por ahora).
- Editar fecha de vencimiento de cuota (el API lo soporta, sin campo en la UI).

## Bloques (checklist TDD)
- [x] Bloque 1: `cobradorApi` — `editarCuota`, `eliminarCuota`, `eliminarAbono` (PATCH/DELETE con password+motivo).
  - Test(s): `src/api/cobrador.test.ts` (+3).
- [x] Bloque 2: UI en `ClienteScreen` — botones "Editar"/"Eliminar" por cuota y diálogo de re-autenticación (contraseña + motivo).
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+2).
- [x] Bloque 3: `scripts/check.sh` verde (133 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- `eliminarAbono` se expone en la API pero sin UI: la tarjeta del cliente no trae abonos individuales (solo cuotas), por lo que no hay dónde mostrarlos aún.
- El diálogo usa el mismo formulario para editar y eliminar (según cuál botón se tocó); tras guardar se recarga el cliente.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (133 tests, 20 suites).
- Archivos modificados: `src/api/cobrador.ts` (+3 métodos), `src/api/cobrador.test.ts` (+3), `src/screens/ClienteScreen.tsx` (botones + diálogo), `src/screens/ClienteScreen.test.tsx` (+2), `docs/ai/tasks/apk-editar-eliminar-cuotas.md`.
- Pendientes/seguimiento: UI de eliminar abono (requiere que el backend exponga abonos en el estado de cuenta).