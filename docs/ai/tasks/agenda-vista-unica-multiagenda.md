---
estado: en-curso
tags: [agenda, calendario, hu-cal-08, multi-agenda]
---

# Agenda en una sola vista y varias agendas (HU-CAL-08)

- **Origen:** [HU-CAL-08](../../../../solvershub-docs/04-fase-1-competir/SPEC-24-agenda-y-citas/hu/HU-CAL-08-multi-agenda.md) y el panel de `feat/hu-cal-08-agenda-unica` (PR #147).
- **Backend:** `feat/hu-cal-08-multi-agenda` (agent-core PR #583). No está en `develop`: los tipos se generaron con
  `API_TYPES_REF=origin/feat/hu-cal-08-multi-agenda npm run api:types`. Antes del merge hay que rebasar y regenerar.
- **Estado:** implementado el corte funcional; falta QA visual/gestual en dev build y el merge del backend para CI.

## Qué se hizo

1. **Vista única.** `CalendarioScreen` deja las 5 pestañas y muestra:
   - chips de agendas (si hay 2+), con «Solo» y filtro de eventos (`calendar_ids`);
   - tira de semana y línea del día (06:00–22:00, ampliable), con citas por color/código y bloqueos rayados;
   - «Nueva cita» y «Ajustes»; sin pestaña de Google ni de Bloqueos.
2. **Multi-agenda.** `GET /pack/calendar/calendars`, `POST/PUT /calendars`, `POST /calendars/{id}/delete` (409 con
   `move_to`), `multi_agenda_modo` y selector de agenda al crear cita/bloqueo.
3. **Citas y bloqueos.** Alta, edición, cancelación, asistencia, historial, aviso al cliente y arrastre/redimensión
   con `PanResponder` (snap de 15 min; el cambio de día se hace en la hoja). Edición de horario con
   `@react-native-community/datetimepicker`.
4. **Ajustes.** Cajón con índice y detalle de Tipos de cita (color, código, responsable, enlace), Horario global y
   Agendas (nombre, descripción, alias, color, zona, horario propio, activa, principal, eliminar/mover citas).
5. **Google en Conexiones.** `GoogleCalendarCard` en Configuración → Conexiones → Canales; «Conectar»/«Editar
   agenda» abren el panel en el negocio activo y la agenda se edita en Agenda → Ajustes.
6. **Menú y deep links.** Agenda queda con una sola entrada/pestaña (`pack_calendar:citas`); `tipos|horario|conexion`
   abren la sección de ajustes correspondiente y `semana|bloqueos` la vista.

## Archivos principales

- `src/modules/calendario/domain/{agenda,zona,layout,horario,notificacion}.ts`
- `src/modules/calendario/components/{BarraAgenda,TiraSemana,LineaDelDia,EventoArrastrable,HojaEvento,HojaAjustes,SelectorColor,SelectorFechaHora,HorarioCampos}.tsx`
- `src/modules/calendario/components/secciones/{SeccionTipos,SeccionHorario,SeccionAgendas,FormularioTipo,FormularioAgenda}.tsx`
- `src/modules/calendario/screens/CalendarioScreen.tsx`
- `src/modules/configuracion/components/GoogleCalendarCard.tsx`
- `src/shared/panel-urls.ts`, `src/shared/navegacion-evento.ts`
- `src/navigation/{menu-panel,PanelShell}.tsx`
- `app.json`, `package.json` (`@react-native-community/datetimepicker`), `jest.setup.ts`

## Verificación

- `npx tsc --noEmit` en verde.
- `npx eslint` sin errores en los módulos tocados.
- `npx jest` con las suites nuevas y existentes; `colores-pendientes.json` bajó al quitar los hex de la pantalla.
- Pendiente: `npm run check` completo (fallará el `api:types:check` hasta que agent-core PR #583 esté en `develop`),
  QA en dev build (picker nativo, gestos, OAuth en el panel) y capturas para la evidencia de la HU.
