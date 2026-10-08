# CHANGELOG — App oficial SolversHub

## 1.0.0 (en preparación)

**App oficial**: el APK de cobranza evoluciona a la app de todo el panel de SolversHub
(SPEC-25), conservando el flujo de campo intacto.

### Nuevo

- Login unificado (panel + campo vía intercambio de tokens), recuperación de contraseña con
  código de un solo uso y desbloqueo biométrico opt-in.
- PanelShell por permisos: Dashboard con KPIs, Operación (conversaciones con acciones,
  escalaciones, clientes), Cobranza admin (resumen, clientes con ficha y cambios, pagos,
  promesas, dispositivos, auditoría, gestores con permisos finos y propietario con cargos y
  mensajes), Comercio (resumen con KPIs, pedidos con cambio de estado, productos,
  promociones, categorías), Calendario (semana, tipos, bloqueos, horario de atención y
  conexión con Google), Negocio (plan/consumo, costos IA), Configuración (colaboradores,
  habilidades, conexiones con checklist de Meta, ajustes del agente: identidad, cerebro y
  memoria) y Herramientas/Plataforma (DLQ, negocios para master).
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

### Corregido

- Pantallas del panel sin encabezado propio (Inicio, Comercio, Calendario, Negocio,
  Configuración) y el selector de negocio respetan el área segura: las pestañas ya no quedan
  bajo la barra de estado (el toque se perdía en Android edge-to-edge).
- Cobranza admin: la barra de pestañas ya no deja un hueco vacío antes del contenido.
- Calendario · Horario confirma "Horario guardado."; Ajustes muestra el resultado junto al
  botón Guardar (antes quedaba arriba, fuera de pantalla).
- Cada pestaña inferior del panel tiene su propio ícono (todas usaban la casa y las
  etiquetas van truncadas).
- Calendario · Conectar con Google abre el panel del mismo entorno que la API (estaba fijo a
  test) y en el negocio activo de la app (`?tenant=`): el panel avisa si su sesión está en
  otro negocio antes de conectar.
