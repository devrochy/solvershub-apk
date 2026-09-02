# Tarea: apk-tarjeta-completa (foto, tipo de pago y detalle expandible del cliente)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 2, 2026-09-01). HU-56/58 (docs/APP_REQUIREMENTS.md:107-108).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Completar la tarjeta del cliente en la APK: mostrar foto (`fotoUrl`), tipo de pago (`tipoPago`) y permitir colapsar/expandir el detalle de estado de cuenta (recuadros por cuota), para una vista limpia y completa (HU-58).

## Fuera de alcance
- Detalle fino con campos adicionales no presentes en el payload (p. ej. historial de visitas por cliente).
- Abonos individuales por cuota dentro del detalle (pendiente del backend).

## Bloques (checklist TDD)
- [x] Bloque 1: `ClienteScreen` — imagen de foto del cliente cuando `fotoUrl` no es null.
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+2: muestra foto/tipoPago cuando existen; no los muestra cuando son null).
- [x] Bloque 2: `ClienteScreen` — tipo de pago visible y detalle de estado de cuenta colapsable/expandible (accesibilityState.expanded).
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+1: colapsa y expande).
- [x] Bloque 3: `scripts/check.sh` verde (119 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- Los campos `fotoUrl` y `tipoPago` ya existen en `ClienteTarjetaPublic` del backend; solo faltaba renderizarlos.
- El estado de cuenta por cuota (de `apk-estado-cuenta-whatsapp`) pasa a colapsable para no saturar la pantalla; por defecto expandido.
- `accessibilityState.expanded` en el contenedor para testear el colapso y accesibilidad.

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (119 tests, 19 suites).
- Archivos modificados: `src/screens/ClienteScreen.tsx` (foto, tipoPago, colapso), `src/screens/ClienteScreen.test.tsx` (+3), `docs/ai/tasks/apk-tarjeta-completa.md`.
- Pendientes/seguimiento: detalle fino (historial de visitas) y abonos por cuota quedan para cuando el backend los exponga.