---
estado: completada
tags: [tarea, migracion]
---

# Tarea: migracion-cartera-gestor-propietario (APK)

- **Origen:** Petición directa del usuario (2026-09-17) — migración de nomenclatura coordinada con backend y panel.
- **Estado:** completada
- **Fecha inicio:** 2026-09-17

## Objetivo
La APK usa el modelo nuevo: Cartera (ex-Ruta), Gestor de cartera (ex-Cobrador), Propietario (ex-Socio), trayecto diario (ex-Día), y consume los endpoints renombrados del backend.

## Fuera de alcance
- `docs/` histórico (se conserva como registro).
- Identidad de app en stores (`bundleIdentifier`/`package`/`scheme` de `app.json`) — decisión del usuario: **solo el nombre visible**.
- Compatibilidad retro de API (renombrado total, sin retro).

## Documento rector
`app-cobranza-admin/docs/glosario.md` + `app-cobranza-admin/docs/ai/tasks/migracion-cartera-gestor-propietario.md`.

## Bloques (checklist TDD)
- [x] Bloque 7: dominio/tipos — `src/types/cobrador.ts` → `gestor.ts`; `RutaApkPublic`→`CarteraApkPublic`, `ClienteCobradorPublic`→`ClienteGestorPublic`, `rutaId`→`carteraId`, `DiaApkPublic`→`TrayectoDiarioApkPublic`, `ClienteDiaPublic`→`ClienteTrayectoDiarioPublic`; `cobrador-permisos.ts`→`gestor-permisos.ts`.
- [x] Bloque 8: API — `src/api/cobrador.ts`→`gestor.ts`; rutas `/gestor/carteras/:id/*`, `/gestor/mis-carteras`, `/auth/gestor/login`; método `dia`→`trayectoDiario`, path `/trayecto-diario`.
- [x] Bloque 9: screens/navegación — `RutasScreen`→`CarterasScreen`, `DiaScreen`→`TrayectoDiarioScreen` (+ test), `SeleccionRutaScreen`→`SeleccionCarteraScreen`, `RutaDetalleScreen`→`CarteraDetalleScreen`; tabs "Carteras"/"Trayecto diario"; rol "Gestor"/"Propietario" en Login/Perfil.
- [x] Bloque 10: storage/offline — claves `cobranza_cache_trayecto_diario_{carteraId}`, `cobranza_gestor_profile`; `app.json` `name` = "CobraIA Gestor".
- Verificación: `scripts/check.sh` (lint + typecheck) OK; tests 58 suites / 424 tests verdes (`jest --maxWorkers=2`).

## Decisiones tomadas durante la implementación
- Renombrado mecánico por substring `ruta→cartera`, `cobrador→gestor`, `socio→propietario`, y reemplazos quirúrgicos de `Día/Dia/dia`→trayecto diario (se excluyeron `diasMora`, `diasEntreCuotas`, `diasNoLaborables`, `"diario"`, y el `dia` de día-del-mes en `visitas/validaciones.ts`).
- `app.json`: solo `name`; se conservan `bundleIdentifier`, `package` y `scheme` (identidad de stores).
- Campos/strings del backend (`totalCobradoDia`, `avisoDiaCobro`, `periodoLiquidacion: "diario"`, etc.) **no** se renombran: son contrato.

## Ambigüedades resueltas con el usuario
- Identidad de app en `app.json` → **solo el nombre visible**.

## Resultado final
- Comandos ejecutados para verificar: `bash scripts/check.sh` (lint 0 errores / 80 warnings; typecheck OK); `npx jest --silent --maxWorkers=2` → 58 suites / 424 tests.
- Archivos modificados: `src/**`, `App.tsx`, `AGENTS.md`, `app.json`.
- Pendientes/seguimiento: actualizar `docs/` históricos no se hizo a propósito; migración del panel (bloques 11–15) pendiente.
