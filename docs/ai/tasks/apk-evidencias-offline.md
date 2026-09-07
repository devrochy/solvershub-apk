---
estado: completada
tags: [tarea]
---

# Tarea: apk-evidencias-offline (evidencias de gasto en modo offline)

- **Origen:** Plan aprobado del usuario para dejar la APK desarrollada (Fase 1, 2026-09-01) + backlog (item "Evidencias de gasto se pierden en modo offline").
- **Estado:** completada
- **Fecha inicio:** 2026-09-01
- **Fecha cierre:** 2026-09-02

## Objetivo
Que el gasto registrado en modo offline conserve sus evidencias (fotos) encolando la imagen en base64 en el payload del evento `gasto`, para que el backend las persista al sincronizar.

## Fuera de alcance
- Vista/descarga de evidencias ya registradas (endpoint backend pendiente).
- Compresión/progreso de subida.

## Bloques (checklist TDD)
- [x] Bloque 1: `use-evidencias.ts` — capturar `base64` del asset con `base64: true` en el picker (librería y cámara) y exponerlo en `EvidenciaSeleccionada`.
  - Test(s): `src/features/gastos/use-evidencias.test.ts` (la evidencia conserva base64; el picker se llama con `base64: true`).
- [x] Bloque 2: helper `evidenciasParaOffline(evidencias)` → `[{nombre, mimetype, base64}]` (omite sin base64).
  - Test(s): `src/features/gastos/use-evidencias.test.ts` (+3 tests del helper).
- [x] Bloque 3: `DiaScreen.registrarGasto` — al encolar offline, incluir `evidencias` en el payload del evento `gasto`.
  - Test(s): `src/screens/DiaScreen.test.tsx` (+1: encola con evidencias base64).

## Decisiones tomadas durante la implementación
- Se usa `base64: true` de `expo-image-picker` (SDK 57): evita instalar `expo-file-system` para leer el archivo. El backend ya persiste `evidencias[]` vía `EvidenciasOfflineService` (máx 5MB por archivo, mimetypes imagen/PDF).
- `payload` de la cola (`Record<string, unknown>`) no necesitó cambios de tipo.
- El test del picker con base64 usa `jest.spyOn` sobre el módulo (el import por nombre lo resuelve).

## Ambigüedades resueltas con el usuario
- (ninguna abierta)

## Resultado final
- Comandos ejecutados para verificar: `scripts/check.sh` verde (89 tests, 16 suites).
- Archivos modificados: `src/features/gastos/use-evidencias.ts` (+helper), `src/features/gastos/use-evidencias.test.ts` (+4), `src/screens/DiaScreen.tsx` (encola evidencias), `src/screens/DiaScreen.test.tsx` (+1), `src/components/EvidenciaPicker.test.tsx` (fixtures con base64), `docs/ai/tasks/apk-evidencias-offline.md`, `docs/ai/tasks/backlog.md`.
- Pendientes/seguimiento: la vista/descarga de evidencias registradas sigue pendiente (endpoint backend).