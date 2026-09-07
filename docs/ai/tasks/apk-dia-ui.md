# apk-dia-ui

- **Rama:** `feature/apk-dia-ui` (desde `develop`)
- **Estado:** en progreso
- **Origen:** prueba de skills de UI (`building-native-ui` + `anti-ui-slop`) sobre la pantalla de cobros del día.

## Objetivo
Rediseño visual de `DiaScreen` (lista de cobros del día) para mejorar jerarquía,
espaciado y consistencia, siguiendo HIG y el design system existente del producto
(semántica de estado verde/rojo/azul de `ColorBadge`). Sin cambios de
comportamiento: todos los `testID`, textos y flujos se preservan.

## Contrato de diseño
1. **Header**: título más prominente (20/700), botón "+ Gastos" como pill relleno
   (affordance clara), sombra sutil en lugar de borde.
2. **Tarjetas de cliente**: fondo blanco + **barra de acento** lateral con el color
   semántico del estado (reemplaza el fondo completo de color), esquinas
   continuas (`borderCurve`) y sombra sutil.
3. **Estados** (mora / compromiso / en trayecto) como **chips** con fondo suave y
   texto del color semántico; montos con `fontVariant: tabular-nums`.
4. **"Cómo llegar"**: botón fantasma (texto cian) en lugar de pill relleno, para
   reducir peso visual.
5. **Botones de acción**: radio/altura consistentes (12, continuos).

## Definición de Terminado
- Test nuevo del acento semántico (Red→Green).
- `scripts/check.sh` verde.

## Resultado real
- Header: título 20/700 + botón "+ Gastos" pill, sombra sutil (boxShadow).
- Tarjetas: blancas con **barra de acento** semántica (`colorDeEstado`), esquinas
  continuas (`borderCurve`) y sombra; estados como **chips** (mora/compromiso/
  en trayecto) con `tabular-nums` en montos; "Cómo llegar" fantasma.
- Botones de acción con radio 12 continuo y texto 15/700.
- Test nuevo del acento semántico (Red→Green). `scripts/check.sh` verde (298 tests).
- Revisión `code-reviewer`: aprobado con observaciones → registradas en backlog
  (doble lenguaje visual del estado; contraste de enlaces cian).
