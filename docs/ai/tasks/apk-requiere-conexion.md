---
estado: completada
tags: [tarea]
---

# Tarea: claridad de operaciones que exigen conexión (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-008` (hallazgo H-47; Bloque B del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que las acciones que hoy fallan con un mensaje genérico cuando no hay red indiquen "Requiere conexión" y no se puedan ejecutar offline; y poder reintentar el sync desde el aviso.

## Fuera de alcance
- Hacer esas operaciones offline (encolarlas) — decisión de producto.
- Captura en segundo plano (`REQ-APK-013`).

## Bloques (checklist TDD)
- [x] Bloque 1: "Nuevo préstamo" deshabilitado sin conexión + aviso "Requiere conexión".
  - Test(s): `src/screens/ClienteScreen.test.tsx`.
- [x] Bloque 2: borrar pago/abono deshabilitado sin conexión.
- [x] Bloque 3: descargar PDF deshabilitado sin conexión + aviso.
  - Test(s): `src/screens/DiaScreen.test.tsx`.
- [x] Bloque 4: botón **Reintentar** en el aviso de error de sync (`SeleccionRutaScreen`).
  - Test(s): `src/screens/SeleccionRutaScreen.test.tsx`.

## Decisiones tomadas durante la implementación
- Se usa `offline.isOnline` para `disabled` + aviso textual (`styles.deshabilitado`), evitando el error genérico.
- "Reintentar" llama a `offline.sincronizar()` y el mensaje se mantiene en el aviso si vuelve a fallar.

## Resultado final
- Verificación: `npx tsc --noEmit` limpio; `npx jest --runInBand` → **58 suites / 418 tests verde**.
- Archivos: `src/screens/ClienteScreen.tsx` (+ test), `src/screens/DiaScreen.tsx` (+ test), `src/screens/SeleccionRutaScreen.tsx` (+ test).
- Pendientes/seguimiento: Bloque B completo (B1-A/B1-B/B2/B3/B4). Otros pendientes de la APK: GPS en segundo plano (`REQ-APK-013`), caché con TTL (`REQ-APK-015`), accesibilidad (`REQ-APK-020`).
