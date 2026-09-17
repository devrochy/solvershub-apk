---
estado: completada
tags: [tarea]
---

# Tarea: persistir la trayectoria en curso (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-012` (hallazgo H-72; Bloque B del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que la trayectoria GPS en curso no se pierda si la app se cierra/reinicia a mitad de ruta: se persiste y se restaura (reanudando el GPS si seguía activa).

## Fuera de alcance
- Captura en segundo plano / `expo-task-manager` (mejora aparte, `REQ-APK-013`).
- Envío de la trayectoria (ya existe al detener).

## Bloques (checklist TDD)
- [x] Bloque 1: módulo `trayectoria-storage` (guardar/leer/limpiar) con validación de contenido.
  - Test(s): `src/features/trayectoria/trayectoria-storage.test.ts`.
- [x] Bloque 2: `useTrayectoria` persiste los puntos a medida que llegan.
- [x] Bloque 3: restaura puntos y reanuda el GPS al montar si había una trayectoria activa.
- [x] Bloque 4: `detener` limpia la trayectoria guardada.
  - Test(s): `src/features/trayectoria/use-trayectoria.test.ts`.

## Decisiones tomadas durante la implementación
- Se extrajo la persistencia a `trayectoria-storage.ts` (evita acoplar el hook a AsyncStorage y separa el contrato de datos).
- `iniciar` sigue reiniciando los puntos; la restauración es solo al montar (ruta en curso).
- Si el contenido guardado está corrupto, se ignora (`null`).

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **58 suites / 414 tests verde**.
- Archivos: `src/features/trayectoria/trayectoria-storage.ts` (+ test), `src/features/trayectoria/use-trayectoria.ts` (+ test).
- Pendientes/seguimiento: B4 (operaciones que exigen conexión); GPS en segundo plano (`REQ-APK-013`).
