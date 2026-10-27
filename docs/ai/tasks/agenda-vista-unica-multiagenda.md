---
estado: en-revision
tags: [agenda, calendario, hu-cal-08, multi-agenda]
---

# Agenda en una sola vista y varias agendas (HU-CAL-08)

- **Origen:** [HU-CAL-08](../../../../solvershub-docs/04-fase-1-competir/SPEC-24-agenda-y-citas/hu/HU-CAL-08-multi-agenda.md) y el panel de `feat/hu-cal-08-agenda-unica` (PR #147).
- **Backend:** agent-core #583 ya está en `develop` (`b279205a`); la app usa el contrato de `develop`
  (`/pack/calendar/calendars`, `calendar_ids`, `calendar_id`), sin `API_TYPES_REF`.
- **PR:** [solvershub-apk #192](https://github.com/devrochy/solvershub-apk/pull/192), en borrador y con CI en verde.
- **Estado:** implementado y verificado en CI; falta QA visual/gestual en dev build para marcar el PR listo.

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

- `npm run lint`, `npm run typecheck` y `npm test -- --silent`: **164 suites / 1077 tests** en verde.
- CI `build-and-test` del PR #192 en verde (lint + typecheck + tests + gitleaks).
- Fronteras de módulos OK; `colores-pendientes.json` bajó al quitar los hex de la pantalla.
- Pendiente: build nuevo de EAS (`datetimepicker` es nativo), QA en dispositivo (picker, gestos, OAuth,
  1 vs. 2+ agendas) y capturas para la evidencia de la HU.
