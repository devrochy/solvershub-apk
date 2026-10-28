---
estado: completada
tags: [tarea]
---

# Tarea: conteo de mensajes pendientes en la bandeja

- **Origen:** Petición directa del usuario (2026-10-28): mostrar en cada conversación el
  conteo de mensajes entrantes pendientes de respuesta y mantener la lista ordenada por
  llegada, con paridad entre el panel y la APK.
- **Estado:** completada
- **Fecha inicio:** 2026-10-28

## Objetivo
Que la bandeja de la APK se comporte como una app de chat: el chat con el último mensaje
aparece primero y, si el cliente escribió después de la última respuesta entregada, la fila
muestra una píldora con el número de mensajes pendientes.

## Decisiones tomadas (con el usuario)
- **Pendiente = mensajes entrantes después de la última respuesta entregada** (agente o
  persona). Se limpia al responder, no al abrir el chat.
- **Orden solo por llegada** (`last_message_at ?? started_at`), sin separar leídos/no leídos.
- **Solo en la fila**: sin contador en el cajón, las pestañas o el título del navegador.

## Bloques (checklist TDD)
- [x] Bloque 1: `ConversationSummary` acepta `pending_count?: number` localmente, sin tocar
  el `schema.d.ts` generado.
- [x] Bloque 2: `ordenarPorLlegada`, `contadorPendientes` y `textoPendientes` en
  `presentacion.ts` (+ tests).
- [x] Bloque 3: la lista aplica el orden en la carga inicial, el refresco y los merges
  (+ test de `unirConversaciones`).
- [x] Bloque 4: `TarjetaConversacion` muestra la píldora y la incluye en el nombre accesible
  (+ tests de `OperacionScreen`).

## Cambios de UI
- Píldora circular de 20 dp con `relleno.primario` / `sobrePrimario`, `tabular-nums` y tope
  `99+`.
- El nombre usa `Montserrat_700Bold` y la vista previa pasa al color de texto principal
  cuando hay pendientes; sin animaciones.
- El globo es decorativo (`accessible={false}`); el `accessibilityLabel` de la tarjeta dice
  «N mensajes sin responder».

## Resultado final
- `npm run check`: **verde** (fronteras, tipos de API, lint, typecheck y
  **185 suites / 1196 tests**) tras regenerar `schema.d.ts` con `origin/develop` del backend.
- Archivos:
  - `src/modules/operacion/api.ts`
  - `src/modules/operacion/presentacion.ts` (+ `.test.ts`)
  - `src/modules/operacion/use-en-vivo.ts` (+ `.test.ts`)
  - `src/modules/operacion/components/TarjetaConversacion.tsx`
  - `src/modules/operacion/screens/OperacionScreen.test.tsx`
  - `src/core/api/schema.d.ts` (regenerado)
  - `docs/ai/tasks/conversaciones-pendientes.md`
- Pendiente/seguimiento: quitar la extensión local de `pending_count` cuando el backend con
  el campo esté en `origin/develop`.
