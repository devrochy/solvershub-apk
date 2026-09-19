---
estado: completada
tags: [tarea]
---

# Tarea: apk-header-menu-notificaciones

- **Origen:** Petición directa del usuario (2026-09-18).
- **Estado:** completada
- **Fecha inicio:** 2026-09-18

## Objetivo
1. Header global en todas las ventanas: hamburguesa (izquierda); avatar+nombre y campana (derecha).
2. Eliminar las barras inferiores; menú lateral contextual + breadcrumb.
3. Carteras con tabs Activas/Inactivas; abrir una cartera en su información.
4. Filtros de clientes (al día / en mora / sin préstamos) en la lista y en el menú.
5. Campana de notificaciones (pagos, gastos, no-pagos, aprobaciones, liquidaciones).

## Fuera de alcance
- Notificaciones push/tiempo real (polling + `lastSeen` local).

## Dependencia backend (PR `app-cobranza#138`)
- `GET /gestor/carteras/:id/clientes` ahora incluye `numPrestamos`/`diasMora`.
- Nuevo `GET /gestor/notificaciones`.

## Bloques (checklist TDD)
- [x] Bloque 1: capa de datos — tipos (`numPrestamos`/`diasMora`, `NotificacionPublic`) y `api.notificaciones()`.
  - Test(s): `src/api/gestor.test.ts`, `src/domain/filtro-clientes.test.ts`.
- [x] Bloque 2: header global (`HeaderApp`: hamburguesa izq; avatar + campana der) + `Breadcrumb` + `NotificacionesProvider`.
  - Test(s): `src/components/MenuLateral.test.tsx`, suites de pantallas.
- [x] Bloque 3: quitar barras inferiores; shell Inicio; menú contextual por sección; abrir cartera en info.
  - Test(s): `src/navigation/CarteraFlujo.test.tsx`.
- [x] Bloque 4: Carteras Activas/Inactivas; filtros de clientes (chips + menú); pantalla de notificaciones.
  - Test(s): `SeleccionCarteraScreen.test.tsx`, `ClientesScreen.test.tsx`.

## Decisiones
- Header: hamburguesa a la izquierda; avatar (abre Perfil) y campana a la derecha.
- "Leído" de notificaciones = `lastSeen` en AsyncStorage; badge = posteriores.
- Filtros: `al_dia` = `numPrestamos>0 && diasMora===0`; `en_mora` = `diasMora>0`; `sin_prestamos` = `numPrestamos===0`.
- Se eliminaron `MainTabsNavigator`, `TabsNavigator`, `CustomTabBar`, `CustomTabBarMain`, `CarterasScreen` y sus tests.

## Resultado final
- Comandos: `scripts/check.sh` verde (57 suites / 424 tests; lint 0 errores / 86 warnings preexistentes).
- Archivos nuevos: `HeaderApp`, `Breadcrumb`, `NotificacionesScreen`, `NotificacionesProvider`, `domain/filtro-clientes`, tests.
- Pendientes/seguimiento: revisión visual en dispositivo; el backend debe tener el PR #138 mergeado.
