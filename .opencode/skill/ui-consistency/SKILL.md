# UI Consistency — Sistema de diseño de la APK (solvershub-apk)

Usar para **cualquier** pantalla o componente nuevo, o al modificar la UI existente. Garantiza que el resultado respete el design system actual del cobrador (CobraIA). Se basa en el código real de `src/screens/*` y `src/components/*`.

## 1. Estilo obligatorio: `StyleSheet.create`

- Toda pantalla/componente usa `StyleSheet.create` **al final del archivo** (antes del `export` o después de los estilos). **No** usar estilos inline, ni Tailwind/NativeWind, ni Styled-Components: este repo es React Native core.
- Cada componente/screen define su propio `styles = StyleSheet.create({...})`. Reutiliza estilos **copiando el patrón**, no importando estilos entre archivos.
- Las claves de estilo son **en español** y descriptivas: `contenedor`, `scroll`, `lista`, `tarjeta`, `form`, `input`, `label`, `chip`, `chipActivo`, `botonPrimario`, `botonSecundario`, `botonTexto`, `mensaje`, `deshabilitado`, `detalle`, `seccion`, `seccionTitulo`, `formTitulo`, `vacio`, `error`.

## 2. Paleta (valores exactos, del código real)

No inventar colores. Usar **solo** estos hex:

| Uso | Hex |
|---|---|
| Primario (acciones) | `#2563eb` |
| Deshabilitado | `#93c5fd` |
| Peligro / error | `#dc2626` |
| Éxito / pago | `#16a34a` |
| Advertencia / no pago | `#d97706` |
| Navegación (cómo llegar) | `#0891b2` |
| Préstamo (accent) | `#7c3aed` |
| Fondo de pantalla | `#f8fafc` |
| Fondo tarjeta / formulario | `#ffffff` |
| Borde tarjeta | `#e2e8f0` |
| Borde input | `#cbd5e1` |
| Texto muted | `#64748b` |
| Texto detalle | `#475569` |
| Texto título | `#334155` |
| Texto sobre color | `#ffffff` |

### Paleta pastel de modales (ModalConFooter / CampoModal)

| Uso | Hex |
|---|---|
| Header de modal (azul principal) | `#172f6c` |
| Texto/icono sobre header | `#ffffff` |
| Subtítulo sobre header | `#d4dff0` |
| Fondo del modal | `#f5f7ff` |
| Fondo de campo | `#ffffff` |
| Borde de campo | `#dbeafe` |
| Fondo chip inactivo | `#eef2ff` |
| Borde chip inactivo | `#c7d2fe` |
| Botón confirmar | `#2563eb` |
| Botón cancelar (fondo/texto) | `#eef2ff` / `#172f6c` |
| Backdrop de modal | `rgba(23, 47, 108, 0.25)` |

Colores semánticos de estado (para `ColorBadge`): `verde #16a34a`, `rojo #dc2626`, `azul #2563eb`, `blanco #94a3b8`.

## 3. Espaciado y radios (reglas)

- Padding de contenido: **16** (`scroll`/`lista`).
- Radio tarjeta / formulario: **12**; radio input / botón: **8**; radio pequeño (botón de cuota): **6**; chip / badge: **999** (pill).
- `gap`: listas y formularios **8–12**; filas de acciones **8–10**.
- `borderWidth: 1` para tarjetas e inputs.
- Botones primarios: `paddingVertical 10–12`, `paddingHorizontal 16`, `alignItems: center`.
- Inputs: `paddingHorizontal 12`, `paddingVertical 10–12`, `fontSize 15–16`.

## 4. Tipografía (jerarquía)

- Títulos de pantalla/header: **fontSize 18–32**, `fontWeight 700`.
- Títulos de sección: **14**, `700`, color `#334155`.
- Títulos de formulario: **15**, `700`.
- Nombres / líneas importantes: **14–16**, `600–700`.
- Detalle / meta: **12–14**, color `#475569`/`#64748b`.
- Texto sobre color (botones/badges): `#ffffff`, `600`.

## 5. Reutilizar componentes compartidos (NO reinventar)

- **`ColorBadge`** (`src/components/ColorBadge.tsx`): única forma de pintar badges de estado con color. Props: `color` (clave semántica) y `label` opcional. No crear badges propios.
- **`ModalConFooter`** (`src/components/ModalConFooter.tsx`): **modal estándar** con header azul principal, cuerpo y footer (Cancelar/Confirmar). Toda pantalla que abra un modal de formulario debe usar este componente (no crear modales propios con header blanco).
- **`CampoModal`** (`src/components/CampoModal.tsx`): **campo estándar** de los modales (label + `TextInput` pastel). Usarlo para los campos de texto dentro de `ModalConFooter`; para widgets custom (chips, mapa, etc.) suavizar con la paleta pastel de modales.
- **`CargaError`** (`src/components/CargaError.tsx`): estado de carga/error/reintentar de cualquier fetch. Props: `cargando`, `error`, `onReintentar`.
- **`EvidenciaPicker`** (`src/components/EvidenciaPicker.tsx`): selección de evidencias (galería/cámara) para gastos.
- Si un patrón visual se repite 2+ veces, **regístralo en `docs/ai/tasks/backlog.md`** (no lo refactorices en el mismo cambio) y proponlo como componente compartido.

## 6. Checklist de UI

- [ ] Usa `StyleSheet.create` al final, claves en español.
- [ ] Colores de la paleta exacta, sin hex inventados.
- [ ] Radios/espaciados según las reglas.
- [ ] Badges con `ColorBadge`; estados de carga con `CargaError`.
- [ ] Textos en español, claros y concisos (ej. "Guardar", "Reintentar", "Datos sin conexión").
