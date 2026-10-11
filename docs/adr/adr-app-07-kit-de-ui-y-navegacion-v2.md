# ADR-APP-07 — Kit de UI en `shared/ui`, panel con 4 destinos + Más y campo de cobranza con sus vistas

- **Estado:** aceptado
- **Fecha:** 2026-10-10
- **Contexto:** SPEC-29 (solvershub-docs), decisiones D-SPEC-29-5 y D-SPEC-29-6 (Diseño aprobado,
  D-32). HU-DS-09 (kit), HU-DS-10 (campo con el kit) y HU-DS-11 (shell del panel en la app).

## Contexto

La app repite estilos en cada pantalla: 48 archivos con colores sueltos y 58 hojas de estilo
propias. Los componentes que podrían reutilizarse (`Avatar`, `ColorBadge`, `ModalConFooter`,
`CampoModal`, `BannerMensaje`) viven en `modules/cobranza/components`, así que ningún otro módulo
puede usarlos sin romper las fronteras de ADR-APP-01. El panel web tiene su kit en
`components/ui` y la marca ya entrega los tokens v1.4 a la app (`src/core/theme/tokens.ts`,
HU-DS-01): estados por tema, densidad, motion y escala tipográfica.

Además, el shell del panel en la app usa hoy hasta 8 pestañas (etiquetas truncadas, blancos chicos)
y el campo de cobranza es el diferencial del producto: los gestores lo usan en la calle con memoria
muscular.

## Decisión

1. **Kit en `src/shared/ui`** (capa de plataforma, sin dominio). Mismos nombres, variantes y estados
   que el kit del panel, en inglés y en `PascalCase.tsx`: `Button`, `IconButton`, `Field`,
   `TextField`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `Toast` (+ `ToastProvider` y
   `useToast`), `Sheet`, `ListItem`/`RecordRow`, `KpiTile`, `PageHeader` y `SyncStatus`. Se exporta
   todo desde `@shared/ui`.
   - Todo sale de los tokens. Los componentes leen `useKit()` (`shared/ui/tema.ts`), que mapea el
     tema activo de `ThemeProvider` a `shTheme.light|dark` y a unos pocos rellenos derivados
     (primario, peligro, ripple, esqueleto, tono `accent`). Es el único archivo del kit que toca
     `shColor`. Un test (`kit.test.ts`) rechaza hex, `rgba()`, `shColor` fuera del mapeo, Roboto e
     imports de módulos.
   - Reglas de la app: blanco táctil de 48 × 48 dp (`shDensity.controlLg`) en todo control; tipografía
     `shType` (Montserrat e Inter); rol, nombre y estado accesibles; el color nunca va solo (un
     `Badge` de estado sin ícono no compila); `maxFontSizeMultiplier` 1,6 solo en cifras densas;
     presión con `Pressable` y `android_ripple` del tema; motion con `shMotion` y 0 ms con "reducir
     movimiento" (`shared/ui/motion.ts`).
   - Sin dependencias nuevas: `Sheet` usa `Modal` y `PanResponder` de React Native (sin
     gesture-handler ni reanimated) y los íconos son `@expo/vector-icons`.
   - Pantalla **Catálogo** (`shared/ui/catalogo/CatalogoScreen.tsx`) con cada componente, variante y
     estado en el tema activo. Solo existe en builds de desarrollo: el shell la registra en "Más"
     detrás de `__DEV__`.
2. **D-SPEC-29-5 · Panel en la app con 4 destinos + Más**: Inicio, Atención, el pack principal del
   negocio (Cobranza, Comercio o Agenda, el primero habilitado) y Buscar. El resto va en "Más". Se
   implementa en HU-DS-11 sobre este kit; hasta entonces `PanelShell` conserva sus pestañas por
   permisos (ADR-APP-02).
3. **D-SPEC-29-6 · El campo de cobranza conserva sus vistas**: cajón lateral, selección de cartera,
   inicio de la cartera, clientes con filtros, diario, ficha del cliente como overlay, préstamo,
   perfil, configuración y notificaciones mantienen flujo, rutas y lógica. HU-DS-10 solo cambia los
   componentes visuales por los del kit. Aplica también a la cobranza admin de la app y sus
   pestañas por sección.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Subir los componentes de `modules/cobranza/components` tal cual a `shared` | Traen dominio y estilos propios (colores sueltos, `urlArchivo` del backend en `Avatar`); el kit nuevo los reemplaza en HU-DS-10 sin mover pantallas ahora |
| Una librería de UI (React Native Paper, Tamagui, gluestack) | Otra fuente de estilos frente a los tokens de la marca y dependencias nuevas; el panel no la usa, así que se pierde la paridad de nombres |
| `react-native-reanimated` + `gesture-handler` para `Sheet` y `Toast` | Dependencias nativas nuevas para dos animaciones cortas; `Animated` y `PanResponder` alcanzan |
| Panel con cajón lateral como el campo (D-SPEC-29-5 B) | Esconde las secciones más usadas detrás de un gesto |
| Rediseñar el campo con pestañas abajo (D-SPEC-29-6 B) | Rompe la memoria muscular de los gestores y arriesga regresiones en el diferencial |

## Consecuencias

**Positivas:** pantallas nuevas sin estilos propios; panel y app se ven como un producto; los
blancos táctiles, la accesibilidad y el contraste se resuelven una vez; cambiar la marca toca solo
`tokens.json`.

**Negativas / lo que aceptamos pagar:** durante HU-DS-10 conviven los componentes de cobranza y los
del kit; el `Sheet` sale sin animación de salida (el `Modal` se desmonta al cerrar) y el gesto de
cierre se toma solo desde el asa y el encabezado; mantener la paridad de nombres con el panel es
disciplina, no un paquete compartido.

**Qué haría que revisáramos esto:** si un paquete compartido entre repos (tokens + contratos de
componentes) se vuelve viable, o si las animaciones del kit necesitan seguir al dedo en todo el
recorrido (entonces se evalúa reanimated con un ADR).

## Impacto en el código

- `src/shared/ui/*` (kit, `tema.ts`, `motion.ts`, `icono.tsx`, tests al lado) y
  `src/shared/ui/catalogo/CatalogoScreen.tsx`.
- `src/navigation/PanelShell.tsx`: entrada "Catálogo de UI" en "Más" solo con `__DEV__`.
- HU-DS-10 migra las pantallas de campo al kit (mismas vistas); HU-DS-11 arma el shell de 4 destinos
  + Más; HU-DS-12 puede subir `motion.ts` a `src/core/theme/`.
