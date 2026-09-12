---
estado: completada
tags: [tarea]
---

# Tarea: apk-evidencias-gasto (evidencias de gasto con cámara/librería)

- **Origen:** Fase A del plan de la APK (A2) aprobado por el usuario 2026-09-01. El gasto ya se registra sin evidencia; se agrega captura/selección de fotos (1-5) enviadas en el multipart `POST /cobrador/rutas/:id/gastos`.
- **Estado:** completada
- **Fecha inicio:** 2026-09-01

## Objetivo
Que el cobrador adjunte 1-5 evidencias (cámara o librería) al registrar un gasto, con permiso, miniaturas y validación.

## Fuera de alcance
- Vista/descarga de evidencias de gastos registrados (endpoint backend de descarga pendiente).
- Compresión/subida progresiva.

## Bloques (checklist TDD)
- [x] Bloque 1: hook `useEvidencias` (`src/features/gastos/use-evidencias.ts`) — estado + `agregarDesdeLibreria`/`agregarDesdeCamara` (permisos, `mediaTypes: ['images']`, hasta 5) + `quitar` + `error`/`cargando`.
  - Test(s): `src/features/gastos/use-evidencias.test.ts` (4, mock expo-image-picker)
- [x] Bloque 2: componente `EvidenciaPicker` (botones Librería/Cámara, miniaturas, quitar) + wiring en `DiaScreen` (gasto form envía las evidencias en el multipart).
  - Test(s): `src/components/EvidenciaPicker.test.tsx` (3)
- [x] Bloque 3: config plugin `expo-image-picker` en `app.json` (permisos photos/camera) + `scripts/check.sh` verde (33 tests).

## Decisiones tomadas durante la implementación
- `expo-image-picker` ~57.0.14; `mediaTypes: ["images"]` (nueva API).
- MimeType por defecto `image/jpeg` si el asset no lo trae; nombre desde `fileName` o generado.
- `renderHook`/`render` de RNTL v14 son async (hay que `await`).

## Ambigüedades resueltas con el usuario
- Pregunta: ¿arrancar A2+A3? → "arranquemos como dices" (A2 primero).

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (lint + typecheck + 33 tests, 7 suites).
- Archivos modificados: `src/features/gastos/use-evidencias.ts` (+test), `src/components/EvidenciaPicker.tsx` (+test), `src/screens/DiaScreen.tsx` (gasto form con evidencias), `app.json` (plugin expo-image-picker), `package.json` (expo-image-picker ~57.0.14), `docs/ai/tasks/apk-evidencias-gasto.md`.
- Pendientes/seguimiento: A3 trayectoria GPS; A4 promesa + A5 abono; A6 UX.