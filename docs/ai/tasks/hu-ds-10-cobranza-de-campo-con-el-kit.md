---
estado: completado
tags: [diseno, ui-kit, cobranza, campo, offline, accesibilidad]
---

# HU-DS-10 · Cobranza de campo con el kit nuevo

- **Origen:** SPEC-29 de `solvershub-docs` (Diseño aprobado, D-32), HU-DS-10
  (`04-fase-1-competir/SPEC-29-sistema-de-diseno-unificado/hu/HU-DS-10-cobranza-de-campo-con-el-kit.md`)
  y la tabla «Vistas de campo de cobranza que se conservan» de `design.md` §5. Issue
  devrochy/solvershub-apk#153. Base: `develop` con el kit (HU-DS-09) y la guarda de colores (HU-DS-02).
- **Regla que manda:** D-SPEC-29-6. El flujo de campo no cambia: mismas vistas, rutas, orden de
  pasos, lógica y textos de acción. Solo cambian piezas visuales (kit de `src/shared/ui`) y colores
  sueltos por tokens.
- **Estado:** completado en código. Faltan las capturas antes/después y el smoke por adb en el OPPO,
  y la publicación gradual por OTA (ver Pendientes). Los hápticos quedan diferidos.

## Qué se hizo

1. **Tema:** `useKit().banda` (en `src/shared/ui/tema.ts`): la banda de marca del header de campo
   (navy en claro, superficie en oscuro) y lo que va encima (texto, subtítulo, borde de píldora,
   relleno translúcido), como roles del tema. Es la misma banda de siempre, sin colores sueltos.
2. **Estado de sincronización visible:** `EstadoSincronizacion` (nuevo, en
   `modules/cobranza/components`) pone el `SyncStatus` del kit bajo la banda de `HeaderApp`, así que
   está en todas las pantallas de campo. Lee el `OfflineContext` que ya existe (sin exigirlo):
   sin red → "Sin conexión · N cambios por enviar"; con red y `errorSync` → "No se pudo sincronizar"
   con **Reintentar**, que llama a la misma `sincronizar()` de siempre (mientras corre, "Enviando N
   cambios…"); si no, "Sincronizado" o "En línea · N cambios por enviar". Cambia solo al volver la
   red. Es región viva (TalkBack anuncia el cambio).
3. **Confirmación de pago:** `Toast` de éxito del kit ("Pago registrado.") al confirmar un pago en
   línea, sin animación con "reducir movimiento" (lo hace el kit). Va **dentro de la modal de cuota**
   (`ModalConFooter` gana la ranura `aviso`) porque un `ToastProvider` en la raíz quedaría tapado por
   el `Modal` nativo. Se va solo a los 5 s (`TOAST_DURACION_EXITO`). Háptico: diferido (ver abajo).
4. **Badge "Pendiente":** `offline/pagos-pendientes.ts` (nuevo) lee la cola que ya existe
   (`listarCola`) cuando cambia `sinSubir` y marca con `Badge` "Pendiente" la cuota, el detalle de la
   cuota y el préstamo de un pago (o abono) guardado sin conexión. Al llegar el ack, `sinSubir` baja
   y el badge se va. Solo lectura: no encola, no borra ni cambia la sincronización (ADR-APP-04).
5. **Pantallas y componentes** con el kit (tabla de abajo). Reglas aplicadas: blancos táctiles de
   48 dp (`shDensity`), `shType` en toda la tipografía, `statusXFg` para texto e íconos de estado,
   estado siempre con ícono o texto (`Badge` con ícono), cifras con `tabular-nums`, roles y estados
   accesibles (`tab`, `radio`, `header`, `selected`, `busy`), `android_ripple` del tema.
6. **Hápticos diferidos:** la app publica por OTA con `runtimeVersion: fingerprint`; agregar
   `expo-haptics` o el permiso `VIBRATE` cambia el fingerprint y exige binario nuevo. Quedan para la
   próxima release nativa (no se agregó ninguna dependencia ni permiso).

## Vista por vista

| Vista | Qué cambió (solo visual) | Qué se conservó (D-SPEC-29-6) |
|---|---|---|
| Header de campo (`HeaderApp`, `HeaderPantalla`, `BotonMenu`) | Banda con `useKit().banda`; título `shType.block` en negrita; menú como `IconButton` inverse y campana de 48 dp; `SyncStatus` bajo la banda | Hamburguesa, título/subtítulo, campana con su badge, acciones contextuales, sin botón atrás |
| Menú lateral (`MenuLateral`) | Tokens, indicador de activo del kit (barra `link` de 3 px y fondo `surfaceRaised`), filas de 48 dp, `accessibilityState` (seleccionado/desplegado), sombras `elev` | Inicio, Carteras (si hay >1), grupo de la cartera con Clientes (Todos, Al día, En mora, Sin préstamos) y Diario; tarjeta de usuario con Perfil, Configuración, Modo oscuro y Cerrar sesión |
| Selección de cartera (`SeleccionCarteraScreen`) | KPIs con `KpiTile`, esqueleto de tarjetas en la carga inicial, `EmptyState` con Actualizar, filtros Activas/Inactivas de 48 dp con rol tab, badge "sin subir" del kit, aviso de error de sync con `Button` | Lista con KPIs, autoselección con una cartera, filtros, pull-to-refresh, flujo a la cartera activa |
| Inicio de la cartera (`CarteraDetalleScreen`) | KPIs con `KpiTile`; estadísticas con tokens (delta con signo y texto); aviso y badge "Datos sin conexión" del kit; botón Nota y "Seleccionar cartera" con `Button` | Información, estadísticas, del día, en mora, notas, editar cartera; mismos modales |
| Clientes (`ClientesScreen`) | Cada cliente es un `ListItem` con `Avatar`, estado en `Badge` con ícono (Al día/En mora/Sin préstamos), llamar/mensaje como `IconButton` de 48 dp, borde izquierdo con el tono del estado; búsqueda de 48 dp; `EmptyState` con acción; alta con `TextField` y `Button` | Filtros desde el menú y los chips (misma `onFiltroChange`), búsqueda, FAB de alta, mismo formulario y validaciones |
| Diario (`TrayectoDiarioScreen`) | Botones del kit: "Generar liquidación" es la CTA primary (y "Generar trayecto" mientras el día no está habilitado); el resto secondary de 48 dp o más con ícono; mora, compromiso y "En trayecto" como `Badge`; avisos con tono e ícono; liquidación con la banda del kit | Pagos y abonos del día, cliente cercano, GPS, gating (trayecto → GPS → lista), liquidación, PDF, trayectos |
| Ficha del cliente (`ClienteScreen`, overlay) | `Button`/`IconButton` del kit (Registrar pago primary al desplegarse, Eliminar danger), `TextField` en la cuota, `Badge` de documentos, chips de 48 dp, toast de pago, badge "Pendiente"; canvas compartible con el tema claro del kit | Préstamos, cuotas, registrar pago o no pago con los mismos pasos (cuota → acción → formulario → guardar), QR, mapa, evidencias, overlay con cierre por gesto |
| Préstamo (`PrestamoScreen`) | Tipografía `shType`, tonos de estado del tema activo en el canvas, "Enviar por WhatsApp" como CTA del kit | Canvas de cuotas y mismo enlace de WhatsApp |
| Perfil, Configuración, Notificaciones | Tokens y `shType`; Configuración con `Button` (Descartar es danger) y mensaje con ícono; Notificaciones con `ListItem` + `IconButton` de descarte, `EmptyState` y "Marcar como vistas" primary | Contenido y acciones |
| Componentes (`ModalConFooter`, `CampoModal`, `CampoTelefono`, `BannerMensaje`, `CargaError`, `ColorBadge`, `EvidenciaPicker`, `TrayectosLista`, `MapaCliente`, `MapaPin`, `CarteraFlujo`) | Banda, `Button` del kit en pies, `TextField` en campos, tonos del kit para los estados del cliente (verde→success, rojo→danger, azul→info, blanco→neutral), titileo de `ColorBadge` respetando reducir movimiento | `ModalConFooter` sigue cerrando solo con la X, el back o Cancelar (no por fondo ni gesto); mismas API y testIDs |

## Deuda de colores (`colores-pendientes.json`)

- **Antes:** 44 archivos, 280 usos (33 archivos de cobranza o del menú lateral, 233 usos).
- **Después:** 19 archivos, 67 usos. Bajó **25 archivos y 213 usos**.
- Cobranza y menú lateral: de 33 archivos / 233 usos a **4 archivos / 20 usos**. Quedan las
  pantallas previas a la sesión, fuera de la tabla de design.md: `LoginScreen` (8),
  `InvitacionesScreen` (6), `SeleccionNegocioScreen` (3) y `VincularDispositivoScreen` (3).

## Tests

Tests de comportamiento de cobranza: verdes **sin cambiar aserciones de flujo**. Ajustados por
detalle visual (sin debilitar lo que verifican):

| Test | Por qué |
|---|---|
| `ColorBadge.test.tsx` | El rojo pasa de `shColor.danger` al `statusDangerFg` del kit; se agrega el mapeo completo de estados |
| `EvidenciaPicker.test.tsx` | `hitSlop` del quitar 12 → 14 (20 dp + 28 = blanco de 48 dp) |
| `HeaderPantalla.test.tsx` | Título de 18 px fijo → `shType.block` (17/24) en Montserrat Bold con `banda.texto` |
| `SeleccionCarteraScreen.test.tsx` | Los KPIs son `KpiTile`: la cifra se lee dentro de la tarjeta (`within(...).getByText("5")`) en vez de `props.children`; se suma el nombre accesible |
| `CarteraDetalleScreen.test.tsx` | Igual que el anterior (4 aserciones de KPI) |
| `ClientesScreen.test.tsx` | La barra de acento es el borde izquierdo del `ListItem` (`borderLeftColor`) y se verifica también el `Badge` con el estado escrito; los chips usan los tonos del kit |
| `TrayectoDiarioScreen.test.tsx` | El error del gasto usa `statusDangerFg` (antes `COLORES.claro.peligro`) |
| `NotificacionesScreen.test.tsx` | El mock de notificaciones pasa a variable para cubrir el estado vacío |

Tests nuevos (+23; 780 → 803):

- `HeaderApp.test.tsx`: chip "Sin conexión · 3 cambios por enviar" que cambia solo al volver la red,
  error con Reintentar que llama a `sincronizar()` y muestra "Enviando…", sin provider no rompe,
  campana y menú de 48 dp, prioridad de estados (`estadoDeSync`).
- `src/navigation/menu-campo.test.tsx`: con el `CarteraFlujo` y el `MenuLateral` reales, el menú
  conserva Inicio, Carteras, Clientes (Todos, Al día, En mora, Sin préstamos) y Diario; con una
  cartera no hay Carteras; ítems de 48 dp.
- `ClienteScreen.test.tsx`: toast de éxito al confirmar un pago (dentro de la modal de cuota), sin
  animación con reducir movimiento, pago sin conexión con los mismos pasos y badge "Pendiente"
  (cuota, detalle y préstamo), sin cambios por enviar no hay badge.
- `pagos-pendientes.test.ts`: pago de cuota, abono, y lo que se ignora.
- `SeleccionCarteraScreen`, `ClientesScreen`, `TrayectoDiarioScreen`, `NotificacionesScreen` y
  `ColorBadge`: EmptyState con acción, esqueleto, CTA primary, blancos de 48 dp, mapeo de estados.

## Resultado real

- `npm run lint` ✓ · `npm run typecheck` ✓ · `node scripts/check-module-boundaries.mjs`: OK.
- `npx jest`: **131 suites, 803 tests ✓** (base de `develop`: 129 suites, 780 tests). La corrida
  completa pasó a la primera; en una corrida parcial con la máquina muy cargada (load 24) hubo 3
  timeouts de 15 s (incluido `pantalla-activa-context`, no tocado) que pasaron al repetir.
- `src/core/api/schema.d.ts` sin tocar. Sin dependencias ni permisos nuevos (el fingerprint de la
  OTA no cambia por esta HU).

## Pendientes (registrados)

- **Hápticos** (éxito al confirmar un pago, aviso en validación): diferidos a la próxima release
  nativa; `expo-haptics`/`VIBRATE` cambian el fingerprint de `runtimeVersion`.
- **Evidencia en el OPPO:** capturas antes/después de cada vista de la tabla (claro y oscuro), smoke
  por adb login → cartera → pago sin conexión → sync, y publicación por EAS Update al 10 %, 50 % y
  100 % con el registro de cada paso. No hubo dispositivo en esta sesión.
- **`Sheet` para registrar pago y editar la nota** (design.md): no se migró. El `Sheet` del kit
  cierra con toque en el fondo y arrastre; hoy `ModalConFooter` solo cierra con X, back o Cancelar.
  Que un pago a medio escribir se pueda perder por un toque es un cambio de comportamiento: lo
  decide el dueño (otra HU). `ModalConFooter` ya usa los botones, la banda y los tokens del kit.
- **Sparkline de recaudo de 7 días** en Inicio: el dato no existe localmente.
- **Estado `syncing` automático:** el chip solo muestra "Enviando…" durante el reintento pedido
  desde él; el motor no expone si está vaciando la cola por su cuenta. Exponerlo es un cambio del
  motor (ADR-APP-04).
- **Badge "Pendiente"** solo para pagos y abonos; los no pagos, gastos y cambios de cliente en cola
  se ven en el contador del `SyncStatus`.
- **Mejoras de flujo vistas y no hechas** (D-SPEC-29-6): unificar con el `SyncStatus` los avisos
  offline que ya existían ("Datos sin conexión", aviso de error de sync de la selección de cartera,
  badge "sin subir"); escribir el estado activa/inactiva junto al punto de color de cada cartera en
  el menú; el mensaje "Pago registrado." se ve en línea y en el toast (se conservó el mensaje).
- **Avatar:** se conserva el `Avatar` de cobranza (resuelve la URL con `urlArchivo`, tamaños 40 a
  92 dp y respaldo con ícono). Pasar al `Avatar` del kit (iniciales) cambia el respaldo visible.
- **`Field` del kit:** `CampoModal` usa `TextField` con la etiqueta visible y como nombre del
  control, sin `Field` (que oculta la etiqueta al lector y rompería las consultas por texto). Revisar
  con TalkBack si la etiqueta se lee dos veces.
- **`SearchInput`** (design.md) no existe en el kit: la búsqueda de clientes quedó con tokens.
- Sombras con `rgba()` dentro de un `boxShadow` (panel del menú lateral, que un test fija) no las
  detecta la guarda de colores.
- Avisos `act(...)` en consola en tests de Configuración e Inicio (previos, no fallan).
