---
estado: completada
tags: [tarea]
---

# Tarea: estadísticas por ruta en la APK

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-004` (hallazgo H-23; Bloque E del plan de analítica, aprobado 2026-09-17).
- **Estado:** completada
- **Fecha inicio:** 2026-09-17

## Objetivo
Mostrar en el detalle de ruta los pares actual/anterior (atrasados, vencidos, total, no visitados) consumiendo `GET /cobrador/rutas/:rutaId/estadisticas` (backend, bloque E1/E3; PR devrochy/app-cobranza#136).

## Fuera de alcance
- Gráficas/histórico más allá del día anterior (el backend solo da actual vs. ayer).

## Bloques (checklist TDD)
- [x] Bloque 1: tipos `EstadisticasConteosPublic` / `EstadisticasRutaPublic` en `types/cobrador.ts`.
- [x] Bloque 2: `api.estadisticasRuta(rutaId)` → `GET /cobrador/rutas/:rutaId/estadisticas`.
  - Test(s): `src/api/cobrador.test.ts`.
- [x] Bloque 3: cache offline de estadísticas (`guardarEstadisticasRuta` / `leerEstadisticasRuta`).
  - Test(s): `src/offline/cache.test.ts`.
- [x] Bloque 4: sección "Estadísticas" en `RutaDetalleScreen` (4 pares actual/anterior + delta, con aviso "Datos sin conexión" al caer al cache).
  - Test(s): `src/screens/RutaDetalleScreen.test.tsx`.
- [x] Verificación: `npx tsc --noEmit` limpio; `npx expo lint` 0 errores; `npx jest --runInBand` → 58 suites / 424 tests verde.

## Decisiones tomadas durante la implementación
- Las estadísticas se cargan en un `try/catch` propio: si fallan (p. ej. backend antiguo o sin permiso), la pantalla sigue funcionando y la sección no se muestra.
- Con error de red se usa el último dato cacheado y se muestra el aviso; sin cache, se oculta la sección.
- Sólo se pintan 4 pares (los del criterio de aceptación); el resto de conteos queda disponible en el tipo para futuras vistas.
- Delta: `+N` en rojo (sube), `-N` en verde (baja), `—` cuando no hay snapshot de ayer.

## Resultado final
- Archivos: `src/types/cobrador.ts`, `src/api/cobrador.ts` (+ test), `src/offline/cache.ts` (+ test), `src/screens/RutaDetalleScreen.tsx` (+ test).
- Comandos: `npx tsc --noEmit`, `npx expo lint`, `npx jest --runInBand`.
- Pendientes/seguimiento: E4 (reporte diario + export en el panel/backend).
