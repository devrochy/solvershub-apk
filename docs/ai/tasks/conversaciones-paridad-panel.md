---
estado: completado
tags: [operacion, conversaciones, bandeja, chat, panel, accesibilidad]
---

# Conversaciones · paridad con la bandeja del panel

- **Origen:** pedido del dueño (2026-10-28) para que la sección de conversaciones de la app tenga
  las mismas funcionalidades que la bandeja del panel web y mejore los estilos de las tarjetas y
  del chat. Se acordó entregar en dos fases: **Fase 1 Conversaciones** y Fase 2 Escalaciones.
  No se tocan Clientes ni Playground.
- **Decisiones:** la caja de respuesta aparece cuando una persona toma el chat **o** cuando el
  agente está pausado. La lista y el hilo se actualizan solos solo con la pantalla enfocada y la
  app en primer plano. Sin cambios de backend ni de `schema.d.ts`.
- **Estado:** fase 1 implementada en la rama `feature/conversaciones-paridad-panel`. Pendiente
  revisión, PR y la fase 2.

## Qué se hizo

1. **API (`src/modules/operacion/api.ts`)**
   - Tipos nuevos: `ConversationConnection`, `MessageItem`, `MessagesSince`, `ConversationNote`,
     `ApprovedTemplate`, `ActiveEscalation`.
   - `listarConversaciones` acepta `connection_id`.
   - Funciones nuevas: `listarConexiones`, `mensajesDesde`, `tomarConversacion`,
     `devolverAlAgente`, `agregarNotaConversacion`, `listarPlantillasDeConversacion` y
     `enviarPlantillaConversacion`.
2. **Presentación (`presentacion.ts`)**
   - Nombres, canal/conexión, hora de chat, fecha/hora, días relativos, costo/tokens.
   - Estados de conversación, agente y escalación con tono e ícono.
   - Motivos de escalación y su tono (riesgo, técnico, informativo, habilidad).
3. **Plantillas (`plantillas.ts`)**
   - `rellenarCuerpo` y `faltantes`, con el mismo comportamiento del panel.
4. **En vivo (`use-en-vivo.ts`)**
   - `usePolling` sin solape, pausado en segundo plano y al desenfocar.
   - Hilo cada 4 s con `?after=` y deduplicación por `id`.
   - Detalle cada 15 s (estado, escalación, notas y uso) y lista cada 12 s.
   - `useConversacionesEnVivo` con primera página en vivo, filtros locales, refresco e infinite
     scroll.
5. **Lista (`components/PestanaConversaciones.tsx`, `TarjetaConversacion.tsx`,
   `FiltrosConversaciones.tsx`)**
   - Buscador con debounce, chips de estado y filtro de conexión en `Sheet`.
   - Tarjeta con avatar y punto de estado, nombre, hora, último mensaje, canal/conexión, estado y
     “Agente pausado”.
   - Esqueletos, estado vacío con acción, error con reintentar, pull-to-refresh y paginación.
6. **Chat (`ConversacionDetalleScreen.tsx` y componentes)**
   - Cabecera con identidad, conexión, badges de estado/agente y costo/tokens.
   - Ticket de escalación con motivo, quién atiende, Tomar y Devolver al agente.
   - Hilo con separadores de día, burbujas entrantes/salientes, herramientas plegables, plantilla
     y mensajes fallidos. Se corrigió la comparación de `direction` a `inbound`.
   - Composer cuando hay persona asignada o agente pausado.
   - Notas internas y selector de plantillas aprobadas en hojas del kit.
   - Acciones secundarias (pausar/reanudar, resolver, notas, plantilla y ficha) en un `Sheet`.
7. **Estilos**
   - Todo con `useKit`, `shType`, `shSpace`, `shRadius` y `shDensity`; sin hex nuevos.
   - Se eliminaron los 4 colores sueltos de `ConversacionDetalleScreen.tsx` y su entrada de
     `src/core/theme/colores-pendientes.json`.
8. **Tests**
   - `OperacionScreen.test.tsx` reescrito: tarjeta, búsqueda, filtros, conexión, error, paginación,
     vacío y pestañas existentes.
   - `ConversacionDetalleScreen.test.tsx` reescrito: cabecera, uso, herramientas, envío, pausa,
     resolver, tomar, devolver, notas, plantilla por ventana vencida, ficha y fallo de envío.
   - Nuevos: `presentacion.test.ts`, `plantillas.test.ts`, `use-en-vivo.test.ts`.
   - `jest.setup.ts`: `useIsFocused` simulado para las pantallas que se renderizan sueltas.

## Tests y gates

- `npx jest src/modules/operacion`: **6 suites, 40 tests ✓** (incluye la fase 2).
- `npx jest src/core/theme/colores-sueltos.test.ts`: **✓**.
- `npm run typecheck`: sin errores en `src/modules/operacion` (quedan errores previos en
  `src/modules/configuracion` por trabajo en curso sin commitear).
- `npm run lint`: sin errores nuevos en `src/modules/operacion` (quedan errores previos de
  `configuracion`).
- `node scripts/check-module-boundaries.mjs`: sin violaciones nuevas (queda una previa en
  `cobranza-admin`).

## Pendientes

- PR de la fase 1 a `develop`.
- Smoke manual en dispositivo con datos reales.
- La fase 2 (Escalaciones) vive en `escalaciones-paridad-panel.md`.
