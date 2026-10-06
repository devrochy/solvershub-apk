# F3 · Módulos del panel en la app (HU-APP-04, 08, 09, 10, 11, 12, 13, 14, 15)

## Resultado

El PanelShell ya no tiene placeholders: cada grupo renderiza su módulo real con la API
`/api/v1` (contratos verificados contra el OpenAPI del backend).

### Refactor de fronteras

- La sesión admin y la API de identidad pasaron a `@core/session` y `@core/api/auth-admin`
  (los módulos no pueden importar del módulo auth, ADR-APP-01).
- Cliente HTTP admin compartido `@core/api/admin.ts` (Bearer + `X-Tenant-Id`, errores
  normalizados) + hook `useAdminApi()`.

### Módulos

| HU | Módulo | Pantallas y acciones | Tests |
|---|---|---|---|
| 04 | `dashboard` | KPIs del negocio + cobranza (según permiso), estado del asistente, recientes, pull-to-refresh, error+reintento | 4 |
| 08 | `operacion` | Conversaciones (búsqueda, filtros, paginación, detalle con hilo), responder como humano, pausar/reanudar asistente, resolver con confirmación; Escalaciones; Leads | 7 |
| 09 | `negocio` | Plan y consumo (barras, planes), Costos IA (hoy/mes/turnos, por modelo) | 3 |
| 10 | `comercio` | Pedidos con cambio de estado (confirmación), Productos, Promociones (toggle), Categorías | 3 |
| 11 | `calendario` | Semana (citas+bloqueos ordenados), Tipos, Bloqueos | 3 |
| 12 | `configuracion` | Colaboradores (activar/desactivar con confirmación), Habilidades (activar/desactivar), Conexiones (estado) | 3 |
| 13 | `herramientas` | Bandeja de fallos (retry), Negocios solo master (suspender/activar) | 3 |
| 14 | `busqueda` | Búsqueda global con debounce, resultados por sección (dentro de Más) | 2 |
| 15 | `@data/sync-engine` | Motor de sync incremental: cursor por entidad, upsert LWW, deletedIds, páginas; corta ante error y conserva cursor | 3 |

### Wiring (PanelShell)

Tabs reales por grupo (Inicio→Dashboard, Conversaciones→Operación, Cobranza→placeholder
pendiente de admin, Comercio, Calendario, Negocio, Configuración) y "Más" ahora es un stack
con Búsqueda global y Herramientas/Plataforma.

## Deuda registrada

- **Cobranza admin en móvil** (carteras, caja, liquidaciones…) sigue como placeholder: la
  vista de administrador del pack llega en una HU propia encima de este shell.
- **Crear/editar** en comercio (productos/promos) y calendario (citas/tipos/bloqueos) es
  read + acciones clave; los formularios móviles completos quedan para iteración.
- **Wire del sync-engine por módulo**: el motor está listo y testeado; cada pantalla lo
  activará al consumir la caché (matriz offline documentada en `src/data/README.md`).
- **Deep links del buscador**: tocar un resultado no navega aún a la entidad (requiere
  navegación cross-tab).
- Escrituras encoladas offline de admin (estado de pedido/cita) llegan con el wire.

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **589/589 tests**
  (31 nuevos en F3 sobre los 558 previos).
- Contratos de todos los endpoints verificados contra `docs/openapi.json` del backend.
