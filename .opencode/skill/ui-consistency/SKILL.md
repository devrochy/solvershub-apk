---
name: ui-consistency
description: "Sistema de diseño de la APK (solvershub-apk). Usar para cualquier pantalla o componente nuevo, o al modificar la UI existente: tokens de marca, kit de src/shared/ui y guarda de colores sueltos."
---

# UI Consistency — Sistema de diseño de la APK (solvershub-apk)

La fuente de verdad es **`DESIGN.md`** en la raíz del repo (SPEC-29, HU-DS-01/02/09/10/11). Esta
skill solo resume lo que no se puede olvidar; ante cualquier duda, abre `DESIGN.md`.

## 1. Color: nunca a mano

- **Prohibido** escribir un hex, `rgb()`/`rgba()` o `shColor.*` fuera de `src/core/theme/` y
  `src/shared/ui/tema.ts`. Lo verifica `src/core/theme/colores-sueltos.test.ts` en el CI y la
  lista `colores-pendientes.json` **solo puede bajar**.
- Las pantallas leen `useKit().c` (tokens semánticos del tema activo: `bg`, `surface`, `text`,
  `textMuted`, `border`, `link`, `statusXFg/Bg/Border`, …) o, en código legado, `useTheme().colores`.
- Botones con relleno: `useKit().relleno.primario` / `sobrePrimario` (nunca `colores.primario`, que
  es la banda de marca y en oscuro queda navy sobre navy).
- Estados siempre con ícono o texto además del color (`Badge` de estado exige ícono).

## 2. Kit antes que estilos propios

`src/shared/ui`: `Button`, `IconButton`, `Field`/`TextField`, `Badge`, `Avatar`, `Skeleton`,
`EmptyState`, `Toast`, `Sheet`, `ListItem`/`RecordRow`, `KpiTile`, `PageHeader`, `SyncStatus`,
`Drawer`, `NavGroup`. Si un patrón se repite en dos módulos, sube al kit (y al catálogo
`src/shared/ui/catalogo/CatalogoScreen.tsx`). Los componentes de dominio de cobranza
(`ModalConFooter`, `CampoModal`, `ColorBadge`, `CargaError`, `EvidenciaPicker`) siguen en
`src/modules/cobranza/components` y ya consumen `useKit`.

## 3. Reglas de la app

- Blancos táctiles de **48 × 48 dp** (`shDensity.controlLg`); tipografía `shType` (Montserrat e
  Inter, nunca Roboto); espacios `shSpace`, radios `shRadius`, motion `shMotion` (0 ms con
  «reducir movimiento»).
- Edge-to-edge: todo bajo `SafeAreaView` o con `useSafeAreaInsets`.
- Tema oscuro por defecto en toda la app (D-34); todo tiene que verse bien en claro y oscuro.
- Navegación del panel en la app: una sección nueva se registra en `src/navigation/menu-panel.ts`
  y su pantalla acepta `pestanaInicial` con `usePestanaInicial` (`@shared/pestana-inicial`).
- Campo de cobranza (D-SPEC-29-6): se conservan vistas, flujo y rutas; solo cambian componentes.

## 4. Checklist

- [ ] Sin colores sueltos (`npm test -- colores-sueltos`).
- [ ] Componentes del kit antes que `StyleSheet` propio.
- [ ] 48 dp, `shType`, área segura, ambos temas.
- [ ] `npm run check` en verde (fronteras, lint, typecheck, tests).
