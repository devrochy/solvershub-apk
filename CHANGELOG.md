# CHANGELOG — App oficial SolversHub

## 1.0.0 (en preparación)

**App oficial**: el APK de cobranza evoluciona a la app de todo el panel de SolversHub
(SPEC-25), conservando el flujo de campo intacto.

### Nuevo

- Logo definitivo de SolversHub en el ícono (iOS y adaptativo de Android, con capa
  monocroma para íconos temáticos), el splash y la pantalla de login.
- Splash compacto (logo a 220 dp sobre navy profundo) que se retiene hasta que la app está
  lista, y presentación en video de primer inicio para quien aún no tiene sesión: omitible,
  silenciada por defecto, con botón de sonido y respeto por “reducir movimiento”.
- Login unificado (panel + campo vía intercambio de tokens), recuperación de contraseña con
  código de un solo uso y desbloqueo biométrico opt-in.
- PanelShell por permisos: Dashboard con KPIs, Operación (conversaciones con acciones,
  escalaciones, clientes), Cobranza admin (resumen, clientes con ficha y cambios, pagos,
  promesas, dispositivos, auditoría, gestores con permisos finos y propietario con cargos y
  mensajes), Comercio (resumen con KPIs, pedidos con cambio de estado, productos,
  promociones, categorías), Agenda en una sola vista (varias agendas con chips y filtros,
  línea del día con arrastre y redimensión, y cajón de ajustes de tipos, horario y agendas;
  Google Calendar se conecta desde Conexiones), Negocio (plan/consumo, costos IA), Configuración (colaboradores,
  habilidades, conexiones con checklist de Meta, ajustes del agente: identidad, cerebro y
  memoria) y Herramientas/Plataforma (DLQ, negocios para master).
- Clientes con paridad al panel: tarjetas con avatar, clasificación, canal,
  teléfono, ubicación, agentes y estado del bot; filtros por canal, conexión y
  packs, paginación, exportación CSV y envío de plantilla desde la tarjeta. La
  ficha del CRM suma perfil editable, pestañas por agente, geocodificación y
  consentimiento. En Cobranza, los clientes de cartera estrenan tarjetas,
  filtro por cartera, alta/edición/eliminación y ficha con préstamos,
  pagos/abonos, cuotas y movimientos.
- Resumen por agente (ADR-0171): el Resumen muestra los KPIs del agente general y, en una
  sección plegable por especialista, los de su actividad y los de su módulo (pedidos, citas,
  recaudo…), siempre contra los 7 días previos. Cada cifra con pantalla en la app lleva a ella; si
  el servicio no responde, quedan las tarjetas de siempre. Las tarjetas usan el `KpiTile` del kit.
- Búsqueda global con resultados por sección (y fallback local sin red).
- Cobranza admin profunda: detalle de cartera (caja, ajustes, liquidación por período, ruta
  optimizada), reportes consolidados, monitoreo IA, reglas de negociación y alertas de acceso.
- Escrituras móviles: crear productos/categorías/promociones, tipos y bloqueos de agenda,
  invitar colaboradores.
- Bandeja de conversaciones con paridad del panel: filtros por estado y conexión, tarjetas con
  último mensaje/canal, lista e hilo en vivo, ticket de escalación, notas internas, plantillas
  fuera de la ventana de 24 h y uso de tokens.
- Herramientas profundas: playground del asistente, plan y suscripción (purga para master),
  plantillas Meta por conexión, opt-out de push y deep links desde resultados de búsqueda.
- Sync offline-first por módulos (cursor incremental, caché cifrada, escrituras encoladas).
- Notificaciones push (Expo) con deep link al diario de campo.
- Seguridad: almacenamiento local cifrado (SQLCipher), certificate pinning de la API,
  auditoría local de acciones críticas.
- Cajón del panel: logo horizontal de SolversHub, grupos plegados con scroll a la sección
  activa y tarjeta de cuenta fija (avatar, nombre y correo) con Perfil, tema y cerrar sesión.
- Perfil propio en la app: nombre, usuario, teléfono, foto y cambio de contraseña, como ruta
  del panel con gesto de volver.

- Cobranza por jerarquía de datos (HU-UX-12): cinco áreas (Resumen, Carteras, Actividad,
  Equipo, Asistente) en dos niveles, en vez de 12 pastillas planas; Clientes pasa a la
  cartera (la ficha de cartera lista sus clientes y el header muestra cartera › cliente);
  Monitoreo IA ya no repite la lista de promesas y Cobranza ya no incluye «Cobros al
  propietario» (lo maneja el agente de suscripciones).

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
- Configuración · Cerebro y Memoria: los números aceptan coma decimal, solo dígitos y sin ceros
  a la izquierda; un campo vacío o fuera de rango se marca y no se guarda (antes pasaba como 0
  o como el valor por defecto en silencio). Los decimales usan el teclado con punto y coma.
- Configuración · Frases prohibidas, palabras de escalamiento y palabras de baja pasan de un
  texto separado por comas a una lista con botón Agregar (también con Enter) y ✕ para quitar:
  ahora se pueden registrar frases con espacios y comas («no, gracias»), sin repetidas ni
  tildes o mayúsculas distintas.
- Configuración · Si escribes una frase en esas listas y pulsas Guardar sin tocar Agregar, la
  frase se suma y se guarda (antes se perdía sin aviso). Si es demasiado corta o la lista está
  llena, aparece un aviso junto al campo y no se guarda. Dos frases hechas solo de emojis o
  símbolos ya no se toman como repetidas.
