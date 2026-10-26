---
estado: completado
tags: [notificaciones, push, campana, panel]
---

# Centro de notificaciones en la APK (ADR-0167)

- **Origen:** `/goal` del dueño — sistema de notificaciones completo en panel y APK (con push) de
  todos los eventos del negocio; campana arriba a la derecha, apertura y cierre animados, íconos y
  colores por categoría y severidad.
- **Backend:** `/api/v1/me/notifications` (feed, contador, leídas, archivar, preferencias, silencio).
  Los tipos salen de `docs/openapi.json` del backend (rama `feat/notificaciones-centro`).

## Qué se hizo

1. **Campana** (`src/shared/ui/CampanaNotificaciones.tsx`): presentacional, 48 dp, globo con tope
   `99+` y nombre accesible con el conteo. `CampanaDelPanel` la conecta al contexto de
   `@core/notificaciones/centro-context` (nada si no hay centro). Va en `HeaderPanel` y en los
   headers nativos de `operacion` y `cobranza-admin`.
2. **Centro** (`src/modules/notificaciones`): `CentroProvider` (contexto + hoja), `CentroSheet`
   (el `Sheet` animado del kit: pestañas Todas/No leídas, filtro por categoría, agrupado por día,
   marcar leídas, archivar, preferencias de push y silencio), `FilaNotificacion` (entrada
   animada con `Animated`, ícono de categoría y tono de severidad con tokens `status*`),
   `use-centro` (contador cada 20 s, lista con la hoja abierta, acciones optimistas con rollback).
3. **Push** (`push.ts`, `provider.tsx`): un canal Android por categoría (`solvershub-<categoría>`),
   handler de primer plano, `alRecibirNotificacion` (refresca el contador), baja del token al
   cerrar sesión con el token de sesión original (antes iba con `Bearer` vacío).
4. **Deep link** (`deep-link.ts`): `destinoDePush` prefiere el `target` neutro
   `{entity, id, section}` y cae al `type` legado.

## Verificación

- `npm run lint`, `tsc --noEmit`, `check-module-boundaries` y jest: 145 suites, 914 tests en verde.
- `npm run check` solo falla en el paso de tipos de API mientras el backend no esté en
  `origin/develop` (`schema.d.ts` se generó desde el worktree del backend); se resuelve al mergear
  el PR del backend.

## Pendientes

- Publicar por OTA (preview) y smoke en el OPPO: requieren OK. Los canales deben existir en el
  teléfono antes de desplegar el backend que envía `channelId = solvershub-<categoría>`.
- Banner animado en primer plano y `userInterfaceStyle`: no incluidos.
