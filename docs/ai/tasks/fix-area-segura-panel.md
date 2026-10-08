---
estado: completada
tags: [tarea]
---

# Tarea: Fix — área segura y confirmaciones del panel (smoke v4)

- **Origen:** smoke del APK preview v4 en el OPPO CPH2603 (2026-10-07), aprobado por el usuario.
- **Estado:** completada
- **Fecha inicio:** 2026-10-07

## Objetivo
Corregir los defectos de layout y feedback que el smoke en dispositivo encontró en las
secciones del dueño.

## Bloques (checklist TDD)
- [x] Bloque 1: `PanelShell` envuelve en `SafeAreaView` (edge `top`) los grupos sin stack
  propio; `usaAreaSeguraSuperior` decide (cobranza y conversaciones ya tienen header nativo).
  - Test(s): `src/navigation/PanelShell.test.tsx`
- [x] Bloque 2: `SeleccionNegocioAdminScreen` pasa a `SafeAreaView` (4 bordes): "Cerrar sesión"
  chocaba con la barra de navegación.
  - Test(s): `src/modules/auth/screens/SeleccionNegocioAdminScreen.test.tsx`
- [x] Bloque 3: `CobranzaAdminScreen` — `flexGrow: 0` en el ScrollView horizontal de pestañas
  (crecía en vertical y dejaba ~700 px vacíos).
  - Test(s): `src/modules/cobranza-admin/screens/CobranzaAdminScreen.test.tsx`
- [x] Bloque 4: Calendario · Horario muestra `horario-mensaje` al guardar (se limpia al editar).
  - Test(s): `src/modules/calendario/screens/CalendarioScreen.test.tsx`
- [x] Bloque 5: `AjustesTab` mueve error/mensaje de guardado al pie (`ajustes-pie`) junto al botón.
  - Test(s): `src/modules/configuracion/screens/ConfiguracionScreen.test.tsx`

## Decisiones tomadas durante la implementación
- El inset se aplica en el shell (un solo punto) y no pantalla por pantalla.
- Evidencia del defecto: barra de estado de 107 px; pestañas en y=31–144; el toque de Maestro
  (centro) caía en la barra y el sistema lo descartaba.

## Resultado final
- Comandos ejecutados para verificar: `npm run check` → 105 suites, 645 tests, verde.
- Pendientes/seguimiento: íconos distintos por pestaña inferior (hoy todas usan `home`) y el
  riesgo de "Conectar con Google" abriendo el tenant de la sesión del navegador.
