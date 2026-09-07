---
estado: completada
tags: [tarea]
---

# Tarea: apk-estado-cuenta-whatsapp (estado de cuenta por cuota + wa.me)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 2, 2026-09-01). HU-54 (docs/APP_REQUIREMENTS.md:97). Decisión del usuario: envío del reporte por WhatsApp con `wa.me` directo (sin depender del gateway del backend).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el cobrador vea el estado de cuenta del préstamo por cuota (recuadros con número, valor, estatus y vencimiento) y envíe el reporte al cliente por WhatsApp abriendo `wa.me` con el texto armado (HU-54).

## Fuera de alcance
- Endpoint `enviar-reporte` del backend (usa el gateway WhatsApp simulado): descartado por decisión del usuario.
- Recuadros con abonos por cuota (el payload `PrestamoPublic.cuotas` no incluye abonos individuales).

## Bloques (checklist TDD)
- [x] Bloque 1: helper `src/features/estado-cuenta/estado-cuenta.ts` — `textoReportePrestamo(prestamo, tarjeta)` y `enlaceWhatsApp(telefono, texto)` (+ `numeroWhatsApp`).
  - Test(s): `src/features/estado-cuenta/estado-cuenta.test.ts` (2).
- [x] Bloque 2: `ClienteScreen` — sección "Estado de cuenta" con recuadro por cuota (mora resaltada) y botón "Enviar por WhatsApp" que abre `wa.me`.
  - Test(s): `src/screens/ClienteScreen.test.tsx` (+2).
- [x] Bloque 3: `scripts/check.sh` verde (116 tests) + commit/PR.

## Decisiones tomadas durante la implementación
- `wa.me` directo: el número se normaliza sin `+` ni espacios (`numeroWhatsApp`) y el texto se codifica con `encodeURIComponent`.
- El reporte se arma de los datos ya disponibles en la APK (`PrestamoPublic.cuotas` + `ClienteTarjetaPublic`); no requiere endpoint nuevo.
- El recuadro de cuota atrasada se resalta en rojo para visibilidad de mora.

## Ambigüedades resueltas con el usuario
- Reporte por WhatsApp: `wa.me` directo desde la APK.

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (116 tests, 19 suites).
- Archivos modificados: `src/features/estado-cuenta/estado-cuenta.ts` (+test), `src/screens/ClienteScreen.tsx` (sección estado de cuenta + botón WhatsApp), `src/screens/ClienteScreen.test.tsx` (+2), `docs/ai/tasks/apk-estado-cuenta-whatsapp.md`.
- Pendientes/seguimiento: abonos por cuota dentro del estado de cuenta dependen de que el backend los exponga en el payload.