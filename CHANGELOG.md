# CHANGELOG — App oficial SolversHub

## 1.0.0 (en preparación)

**App oficial**: el APK de cobranza evoluciona a la app de todo el panel de SolversHub
(SPEC-25), conservando el flujo de campo intacto.

### Nuevo

- Login unificado (panel + campo vía intercambio de tokens), recuperación de contraseña con
  código de un solo uso y desbloqueo biométrico opt-in.
- PanelShell por permisos: Dashboard con KPIs, Operación (conversaciones con acciones,
  escalaciones, clientes), Cobranza admin (resumen, clientes con ficha y cambios, pagos,
  promesas, dispositivos, auditoría), Comercio (pedidos con cambio de estado, productos,
  promociones, categorías), Calendario (semana, tipos, bloqueos), Negocio (plan/consumo,
  costos IA), Configuración (colaboradores, habilidades, conexiones) y Herramientas/Plataforma
  (DLQ, negocios para master).
- Búsqueda global con resultados por sección (y fallback local sin red).
- Cobranza admin profunda: detalle de cartera (caja, ajustes, liquidación por período, ruta
  optimizada), reportes consolidados, monitoreo IA, reglas de negociación y alertas de acceso.
- Escrituras móviles: crear productos/categorías/promociones, tipos y bloqueos de agenda,
  invitar colaboradores.
- Herramientas profundas: playground del asistente, plan y suscripción (purga para master),
  plantillas Meta por conexión, opt-out de push y deep links desde resultados de búsqueda.
- Sync offline-first por módulos (cursor incremental, caché cifrada, escrituras encoladas).
- Notificaciones push (Expo) con deep link al diario de campo.
- Seguridad: almacenamiento local cifrado (SQLCipher), certificate pinning de la API,
  auditoría local de acciones críticas.

### Campo (sin regresiones)

- Diario, clientes, visitas pago/no-pago, gastos con evidencias, trayectoria GPS,
  liquidación con PDF y cola offline idempotente — intactos, ahora sobre la base cifrada.
