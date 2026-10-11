---
estado: completado
tags: [diseno, ui-kit, accesibilidad, tema]
---

# HU-DS-09 · Kit de componentes de la app

- **Origen:** SPEC-29 de `solvershub-docs` (Diseño aprobado, D-32), HU-DS-09. Issue
  devrochy/solvershub-apk#149. Apilada sobre HU-DS-01 (#148, tokens v1.4).
- **Estado:** completado en código. Faltan las capturas en claro y oscuro desde el OPPO y la
  revisión con la fuente del sistema al 200 % (ver Pendientes).

## Qué se hizo

1. **`src/shared/ui/`** (nuevo), exportado desde `@shared/ui`:
   - `Button`: `variant` primary · secondary · ghost · danger · link, `size` sm · md · lg,
     `loading` (spinner encima del contenido invisible, así el ancho no cambia;
     `accessibilityState.busy` y `disabled`), `iconLeft`/`iconRight`, `fullWidth`.
   - `IconButton`: `label` obligatorio (nombre accesible), `tone`, `size`, `selected`.
   - `Field` + `TextField`: label, hint, error (con ícono, región viva `polite`) y required. El
     control recibe por contexto el nombre ("Teléfono, obligatorio"), la pista (error o ayuda) y el
     estado inválido (borde `statusDangerFg`); el label visible se oculta al lector para no leerlo
     dos veces. Foco con borde `focus` de 2 px.
   - `Badge`: `tone` neutral · info · success · warning · danger · accent. Con tono de estado el
     `icon` es obligatorio en los tipos (unión discriminada).
   - `Avatar`: imagen o iniciales (cae a iniciales si la imagen falla), `size` xs · sm · md · lg
     (24 · 32 · 40 · 56 dp) y `status` con texto en el nombre accesible.
   - `Skeleton`: `shape` text · rect · circle y `lines`. Estático y oculto al lector.
   - `EmptyState`: icon, title (encabezado), description y `action` o `secondaryAction`
     (sin ninguna no compila).
   - `Toast` + `ToastProvider` + `useToast()`: success con `role=status` que se va a los 5 s,
     error con `role=alert` y botón "Cerrar aviso" que espera a que lo cierren. Contenedor como
     región viva; en iOS, `announceForAccessibility`.
   - `Sheet`: `Modal` inferior con asa, título como encabezado, "Cerrar" de 48 dp, back de Android
     (`onRequestClose`), toque en el fondo y arrastre hacia abajo desde el asa o el encabezado
     (`PanResponder`, sin gesture-handler). Pie opcional para la CTA.
   - `ListItem`/`RecordRow`: leading, title, subtitle, meta, trailing, badge, onPress (rol botón con
     nombre compuesto y chevron), selected (fondo `surfaceRaised` e indicador de 3 px) y disabled.
     `RecordRow` agrega la cifra a la derecha con `tabular-nums`.
   - `KpiTile`: label, value (`tabular-nums`), `delta` escrito con flecha ("+12 % frente a los
     7 días anteriores", "−3,5 %", "Sin cambio…"), `polarity` up-good · up-bad (el color es
     secundario), loading (esqueleto y `busy`), error y onPress.
   - `PageHeader`: título (encabezado, `shType.h1`), descripción, acciones y "Volver" opcional.
   - `SyncStatus`: online · offline · syncing · error, `pending` y `onRetry` ("Sin conexión ·
     3 cambios por enviar"; con error y `onRetry` es un botón "Reintentar" de 48 dp).
   - Soporte: `tema.ts` (`useKit()`, único archivo que toca `shColor`), `motion.ts`
     (`useReduceMotion`, `duracion` y `curva` sobre `shMotion`) e `icono.tsx` (íconos decorativos
     ocultos al lector).
2. **Reglas aplicadas:** blancos de 48 dp en todo control (`minHeight`/`minWidth` con
   `shDensity.controlLg`), `shType` (Montserrat/Inter, nada de Roboto), rol, nombre y estado
   accesibles, color siempre con ícono o texto, `maxFontSizeMultiplier` 1,6 solo en cifras (KPI,
   valor de `RecordRow`, `Badge`, `SyncStatus`), `Pressable` con `android_ripple` del tema y
   animación de `Toast` (`dur-base`, `ease-out`) y `Sheet` (`dur-slow`, `ease-emphasized`) en 0 ms
   con "reducir movimiento".
3. **Catálogo** (`src/shared/ui/catalogo/CatalogoScreen.tsx`): todos los componentes con sus
   variantes y estados, botón para alternar el tema, toasts y una hoja de ejemplo. Registrado en
   `src/navigation/PanelShell.tsx` como entrada "Catálogo de UI" del menú "Más", solo con `__DEV__`
   (`catalogoDisponible()`).
4. **`docs/adr/adr-app-07-kit-de-ui-y-navegacion-v2.md`**: kit `shared/ui`, D-SPEC-29-5 (4 destinos
   + Más, HU-DS-11) y D-SPEC-29-6 (el campo conserva sus vistas).

## Ciclo TDD

- **Red:** 15 suites nuevas en `src/shared/ui` fallando por falta de los módulos.
- **Green:** kit implementado; ajustes de los tests al diseño (el label del `Field` es visible pero
  oculto al lector, así que se busca con `includeHiddenElements`).
- Tipos: `tipos.test.tsx` usa `// @ts-expect-error` para `Badge` de estado sin ícono,
  `IconButton` sin `label` y `EmptyState` sin acción. Lo valida `tsc` (si dejan de ser error,
  `npm run typecheck` falla).
- `kit.test.ts`: exporta los componentes de la HU, sin hex ni `rgba()`, `shColor` solo en
  `tema.ts`, sin Roboto y sin imports de `modules/`.

## Resultado real

- `node scripts/check-module-boundaries.mjs`: OK.
- `npm run lint` ✓ · `npm run typecheck` ✓.
- `npx jest`: **128 suites, 777 tests ✓** (base de #148: 111 suites, 682 tests; +17 suites y +95
  tests: 93 del kit y 2 del `PanelShell`).
- `npm run check` no se corrió completo: se detiene en el paso de tipos de API porque
  `src/core/api/schema.d.ts` está desfasado frente a `develop` del backend (problema previo, no de
  esta HU; el archivo queda sin tocar).
- Ninguna pantalla de cobranza cambia (D-SPEC-29-6). El único archivo existente modificado es
  `PanelShell.tsx` (entrada del catálogo, solo en desarrollo) y su test.

## Pendientes (registrados)

- Capturas del Catálogo en claro y oscuro desde el OPPO y revisión con la fuente del sistema al
  200 % y TalkBack (evidencia de la HU; necesita un build de desarrollo en el dispositivo).
- `Sheet` sin animación de salida (el `Modal` se desmonta al cerrar) y gesto de cierre solo desde
  el asa y el encabezado. Seguir al dedo en todo el recorrido sería con reanimated (ADR aparte).
- Hápticos (`expo-haptics`, dependencia nueva) para el toast de pago: HU-DS-10/HU-DS-12.
- Componentes de la tabla de diseño que no pide esta HU: `Checkbox`, `Radio`, `Switch`, `Select`,
  `SearchInput`, `Tabs`, `Confirm`, `Separator` y `ChartCard`.
- Migrar `Avatar`, `ColorBadge`, `ModalConFooter`, `CampoModal` y `BannerMensaje` de cobranza al
  kit: HU-DS-10.
- `motion.ts` puede subir a `src/core/theme/` en HU-DS-12, como prevé el diseño.
