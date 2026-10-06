# HU-APP-03 · Navegación por permisos y roles (app)

## Resultado

La app decide el shell por rol y arma la navegación del panel desde los permisos del backend
(`MeResponse.permissions`, ADR-0047/0063), con el flujo de campo intacto.

### Qué se agregó

- `@core/permisos.ts`: RBAC de navegación — `puedeVerSeccion`, `seccionesPermitidas`,
  `grupoVisible` (master bypass; sección `null`/ausente oculta; "nunca un 403 por diseño").
- `src/navigation/PanelShell.tsx`: shell del panel (bottom-tabs + lista "Más") armado SOLO con
  grupos/secciones permitidas. Grupos: Inicio, Conversaciones, Cobranza (13 sub-secciones),
  Comercio, Calendario, Negocio, Configuración y Plataforma (solo master). Cada tab es un
  placeholder (`SeccionEnConstruccion`) hasta que llegue el módulo real (HU-APP-04/08+).
  `seccionesDeMenu()` (lógica pura) separada para tests.
- Login unificado (HU-APP-02) ampliado: `tenantCount > 1` → `SeleccionNegocioAdminScreen`
  (lista de `/api/v1/admin/tenants` activos → `seleccionarNegocio` del contexto admin → exchange);
  exchange 403 (`sin_acceso_campo`) → **entra al panel** con la sesión admin (usuario panel-only).
- `AdminSessionContext.seleccionarNegocio(tenantId)`: re-consulta `/admin/me` con `X-Tenant-Id`
  y actualiza la sesión persistida.
- `App.tsx`: selección de shell — gestor → flujo de campo legado; propietario/master o modo
  panel → `PanelShell`; hidratación inicial de usuarios de panel (admin persistido sin tokens de
  campo); `modoPanel` vía ref de composición.

### Notas / deuda registrada

- Los permisos FINOS del gestor (14) no llegan aún en el login/exchange del backend: el gating
  de acciones de campo (p. ej. registrar pago) queda pendiente de una HU de seguimiento con
  cambio en agent-core (exponer `permisos` del gestor en la respuesta de login/exchange).
- FieldShell con bottom-tabs (Diario/Carteras/Clientes/Notificaciones/Perfil) llega con la
  migración de cobranza (HU-APP-07); hoy el menú lateral legacy cumple ese rol.
- Las rutas profundas sin permiso (deep links) se resuelven en HU-APP-05.

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **536/536 tests**
  (19 nuevos: permisos, PanelShell, menú puro, selector admin, flujos del login).
- `jest.setup.ts`: `SafeAreaInsetsContext` agregado al mock global (lo exige el tab bar).
