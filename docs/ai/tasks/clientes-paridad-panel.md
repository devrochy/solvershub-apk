---
estado: terminada
tags: [tarea]
---

# Tarea: Clientes de la APK con paridad al panel

- **Origen:** petición directa del usuario (2026-10-28).
- **Estado:** terminada.
- **Rama:** `feat/clientes-paridad-panel` (una sola rama, aprobada por el usuario).

## Objetivo

Llevar las dos secciones de Clientes de la app al nivel del panel web, con la
gramática visual de la APK:

- **Operación › Clientes (CRM/leads):** tarjetas ricas, filtros por canal,
  conexión y packs, paginación, pausa del bot desde la tarjeta, llamar/WhatsApp,
  exportación CSV, envío de plantilla y ficha completa (perfil editable,
  pestañas por agente, geocodificación, consentimiento, notas e historia).
- **Cobranza › Clientes (cartera):** tarjetas con riesgo, cartera, documento,
  teléfono, negocio y tope; búsqueda y filtro por cartera; alta, edición y
  eliminación; ficha con resumen, préstamos, pagos/abonos, cuotas y movimientos.

## Fuera de alcance

- El flujo de campo de cobranza (`src/modules/cobranza`) no cambia.
- No se agregaron endpoints: se usan los contratos ya presentes en
  `src/core/api/schema.d.ts` (`/admin/leads`, `/perfil`, `/geocodificar`,
  `/consentimiento`, plantillas, CSV y `/pack/cobranza/*`).
- No se agregaron dependencias nativas nuevas (`expo-file-system`,
  `expo-sharing` y `expo-crypto` ya estaban instalados).

## Bloques (checklist)

- [x] Fundamentos compartidos: `Card` del kit, formateadores de cliente,
  `getTexto`/cabeceras en el cliente admin, `tenantRole` en la sesión.
- [x] CRM: API de filtros, conexiones, perfil, geocodificación, consentimiento,
  CSV y plantillas.
- [x] CRM: tarjeta, filtros en hoja, paginación, botón del bot y acciones de la
  tarjeta.
- [x] CRM: ficha con perfil editable, pestañas por agente, geocodificación,
  consentimiento, notas e historia.
- [x] Cobranza: API de alta/edición/eliminación, préstamos, pagos, abonos y
  cuotas.
- [x] Cobranza: tarjeta, filtro por cartera, alta/edición/eliminación y ficha
  completa.
- [x] Tests de API, tarjetas, filtros, hojas, ficha CRM, ficha Cobranza y
  pantallas.
- [x] `npm run check` en verde.

## Decisiones de implementación

- La tarjeta CRM muestra avatar, nombre/alias, clasificación, canal, teléfono,
  ubicación, agentes (atenuados si no tienen datos) y estado del bot. El color
  nunca va solo: clasificación, riesgo y bot llevan icono y texto.
- Los filtros del CRM viven en una hoja (`Sheet`) para no llenar la pantalla;
  la búsqueda tiene debounce de 350 ms. Los filtros se aplican contra la API
  (`channel`, `connection_id`, `filtro=clave:valor`), no en memoria.
- La ficha del CRM usa `perfil`/`campos_perfil` y deja un fallback con los
  hechos de memoria para backends anteriores. El perfil se guarda con
  `PATCH /admin/leads/{id}/perfil`; si cambia la dirección, se intenta
  geocodificar sin bloquear el guardado.
- La ficha de Cobranza reutiliza `ClienteFormSheet`, `PrestamoSheet`,
  `MovimientoSheet` y `CuotaSheet`; tras cada acción recarga la ficha.
- Exportar CSV usa `getTexto` y comparte el archivo con el selector del
  sistema. La plantilla replica la vista previa + confirmación con
  `Idempotency-Key`.
- `menu-panel.ts` se movió a `src/shared/menu-panel.ts` (con re-export en
  `src/navigation`) para que el módulo `cobranza-admin` cumpla las fronteras
  de ADR-APP-01.

## Ambigüedades resueltas con el usuario

- Se trabajaron **ambas** secciones de Clientes en **una sola rama**.
- Se incluyeron todas las funcionalidades pedidas: tarjetas y filtros, ficha
  completa, pausa del bot, CSV, plantilla y llamar/WhatsApp. Las que no existen
  en el pack de Cobranza (bot, CSV, plantilla) se muestran solo en CRM.

## Verificación

- `npm run check` → fronteras OK, `schema.d.ts` regenerado, lint, typecheck y
  tests en verde.
- Pruebas nuevas de API (`operacion/api.test.ts`, `cobranza-admin/api.test.ts`),
  tarjetas, filtros, hojas, consentimiento, plantilla y pantallas.
- Prueba manual pendiente en dispositivo (claro/oscuro, fuente 200 %, permisos
  de solo lectura y sin red) al publicar la OTA.

## Riesgos / seguimiento

- El backend de test debe tener desplegados `perfil`, `agentes`,
  `geocodificar`, `consentimiento` y plantillas de la tanda 1A. La app degrada
  con mensajes claros si alguna ruta no existe.
- El schema generado se actualizó desde `origin/develop` del backend; el diff
  incluye endpoints nuevos que no usa esta tarea (dispositivos/access).
- La lista de Cobranza mantiene el límite de 300 clientes que ya tiene el pack;
  si el negocio crece, habrá que pedir paginación al backend.
