# Tarea: A3 — PrestamoScreen con WhatsApp en el canvas

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A3).
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
`PrestamoScreen` (canvas de cuotas) incluye el botón "Enviar por WhatsApp" con el estado de cuenta del préstamo. Se pasa `telefonoWhatsapp` por params de navegación desde `ClienteScreen`.

## Bloques (checklist TDD)
- [x] Bloque 1: `RootStackParamList.Prestamo` incluye `telefonoWhatsapp`; `ClienteScreen` lo envía al navegar.
- [x] Bloque 2: Botón `btn-whatsapp-canvas` en PrestamoScreen construye el reporte desde el estado de cuenta y abre `wa.me`.
- [x] Verificación: test de WhatsApp en PrestamoScreen + `scripts/check.sh` verde (156 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (156 tests).
- Archivos: `src/screens/PrestamoScreen.tsx`, `src/screens/PrestamoScreen.test.tsx`, `src/navigation/types.ts`, `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `docs/ai/tasks/a3-canvas-whatsapp.md`.
- Pendientes: ninguno.