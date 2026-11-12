import type { AccionDeAgente, CuentaDePago, HabilidadDeAgente } from "./api";

/**
 * Textos de la ficha del agente (ADR-0190, HU-AOS-66): sus habilidades y sus acciones agrupadas por lo que
 * hacen. El backend manda solo claves (`pack_payments`, grupo `citas`…); los nombres los pone la app, con los
 * mismos textos que el panel. De cara al dueño se dice «habilidad» y «acción», nunca pack, plugin ni tool.
 */

export const PAGOS = "pack_payments";
export const CONOCIMIENTO = "pack_knowledge";

const HABILIDADES: Record<string, { nombre: string; descripcion: string }> = {
  [PAGOS]: {
    nombre: "Pagos en línea",
    descripcion: "El agente envía links de pago y confirma los pagos con la cuenta Wompi elegida.",
  },
  [CONOCIMIENTO]: {
    nombre: "Conocimiento",
    descripcion: "El agente responde con los documentos que le cargues.",
  },
};

export function textoDeHabilidad(packId: string): {
  nombre: string;
  descripcion: string;
} {
  return HABILIDADES[packId] ?? { nombre: "Habilidad", descripcion: "" };
}

export type EstadoDeHabilidad = "sin_agregar" | "lista" | "falta_configurar";

export function estadoDeHabilidad(h: HabilidadDeAgente): EstadoDeHabilidad {
  if (!h.installed) return "sin_agregar";
  return h.status === "active" ? "lista" : "falta_configurar";
}

/** La cuenta Wompi que eligió el agente, si sigue existiendo entre las del negocio. */
export function cuentaDelAgente(h: HabilidadDeAgente, cuentas: CuentaDePago[]): CuentaDePago | undefined {
  const id = h.config?.["cuenta_id"];
  return typeof id === "string" ? cuentas.find((c) => c.id === id) : undefined;
}

export function etiquetaDeCuenta(c: CuentaDePago): string {
  return `${c.name} · ${c.sandbox ? "pruebas" : "producción"}`;
}

/** Grupos en el orden en que se muestran; «Otras acciones» siempre al final. */
const GRUPOS: { id: string; titulo: string }[] = [
  { id: "pedidos", titulo: "Pedidos" },
  { id: "cotizaciones", titulo: "Cotizaciones" },
  { id: "catalogo", titulo: "Catálogo" },
  { id: "citas", titulo: "Citas" },
  { id: "disponibilidad", titulo: "Disponibilidad" },
  { id: "cartera", titulo: "Cartera" },
  { id: "promesas", titulo: "Promesas de pago" },
  { id: "suscripciones", titulo: "Suscripciones" },
  { id: "pagos", titulo: "Pagos" },
  { id: "leads", titulo: "Leads" },
  { id: "clientes", titulo: "Clientes" },
  { id: "conversacion", titulo: "Conversación" },
  { id: "conocimiento", titulo: "Conocimiento" },
];
const OTRAS = { id: "otras", titulo: "Otras acciones" };

/** Nombre de la acción para el dueño (los del panel); si no está, su nombre técnico en palabras. */
const NOMBRES: Record<string, string> = {
  generar_cotizacion: "Preparar una cotización",
  aplicar_promocion: "Aplicar una promoción",
  confirmar_cotizacion: "Confirmar la cotización",
  crear_pedido: "Crear el pedido",
  agregar_item_pedido: "Agregar productos al pedido",
  consultar_estado_pedido: "Consultar el estado de un pedido",
  consultar_inventario: "Consultar el inventario",
  recomendar_producto: "Recomendar productos",
  crear_lead: "Registrar un interesado",
  calificar_lead: "Calificar a un interesado",
  actualizar_lead: "Actualizar los datos de un interesado",
  confirmar_pago_pedido: "Confirmar el pago de un pedido",
  verificar_pago_pedido: "Verificar el pago de un pedido",
  sub_link_pago: "Enviar el enlace de pago de una suscripción",
  cob_link_suscripcion: "Enviar el enlace de pago de una suscripción en cobro",
  create_calendar_event: "Agendar una cita",
  update_calendar_event: "Mover una cita",
  cancel_calendar_event: "Cancelar una cita",
  check_availability: "Consultar la disponibilidad",
  find_next_available: "Buscar el próximo espacio libre",
  list_client_appointments: "Ver las citas del cliente",
  list_calendars: "Ver las agendas",
  list_appointment_types: "Ver los tipos de cita",
  cob_consultar_saldo: "Consultar el saldo",
  cob_estado_cuenta: "Enviar el estado de cuenta",
  cob_evaluar_negociacion: "Evaluar una negociación",
  cob_opciones_promesa: "Ofrecer opciones de promesa de pago",
  cob_registrar_promesa_pago: "Registrar una promesa de pago",
  cob_registrar_promesa_saldo: "Registrar una promesa sobre el saldo",
  cob_registrar_abono: "Registrar un abono",
  cob_consultar_suscripcion: "Consultar una suscripción en cobro",
  cob_crear_suscripcion: "Crear una suscripción en cobro",
  cob_pausar_suscripcion: "Pausar una suscripción en cobro",
  cob_cancelar_suscripcion: "Cancelar una suscripción en cobro",
  cob_renovar_suscripcion: "Renovar una suscripción en cobro",
  sub_listar_planes: "Mostrar los planes",
  sub_cotizar_inscripcion: "Cotizar la inscripción a un plan",
  sub_inscribir: "Inscribir en un plan",
  sub_confirmar_inscripcion: "Confirmar la inscripción",
  sub_consultar: "Consultar la suscripción",
  sub_cotizar_cambio_plan: "Cotizar un cambio de plan",
  sub_cambiar_plan: "Cambiar de plan",
  sub_aplicar_cambio_plan: "Aplicar el cambio de plan",
  sub_pausar: "Pausar la suscripción",
  sub_cancelar: "Cancelar la suscripción",
  get_customer_profile: "Ver el perfil del cliente",
  update_customer_profile: "Actualizar el perfil del cliente",
  consultar_datos_cliente: "Consultar los datos del cliente",
  consultar_historial_cliente: "Consultar el historial del cliente",
  remember_fact: "Recordar un dato del cliente",
  search_memories: "Buscar en lo que recuerda",
  escalate_to_human: "Pasar la conversación a una persona",
  set_conversation_note: "Dejar una nota en la conversación",
  send_email: "Enviar un correo",
  enviar_plantilla_opciones: "Enviar opciones con botones",
  buscar_conocimiento: "Buscar en tus documentos",
};

export function nombreDeAccion(tool: string): string {
  const conocido = NOMBRES[tool];
  if (conocido) return conocido;
  const texto = tool.replace(/[_-]+/g, " ").trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Título de un grupo; un grupo que la app aún no conoce se muestra con su clave en palabras, no se pierde. */
export function tituloDeGrupo(id: string): string {
  return GRUPOS.find((g) => g.id === id)?.titulo ?? (id === OTRAS.id ? OTRAS.titulo : nombreDeAccion(id));
}

/** Acciones agrupadas: primero los grupos conocidos en su orden, luego los desconocidos y al final «Otras». */
export function agruparAcciones(
  acciones: AccionDeAgente[],
): { id: string; titulo: string; acciones: AccionDeAgente[] }[] {
  const ids = [...new Set(acciones.map((a) => a.group || OTRAS.id))];
  const conocidos = GRUPOS.map((g) => g.id);
  const orden = (id: string) =>
    id === OTRAS.id ? Number.MAX_SAFE_INTEGER : conocidos.indexOf(id) >= 0 ? conocidos.indexOf(id) : conocidos.length;
  return ids
    .sort((a, b) => orden(a) - orden(b))
    .map((id) => ({
      id,
      titulo: tituloDeGrupo(id),
      acciones: acciones.filter((a) => (a.group || OTRAS.id) === id),
    }));
}

/** Una acción corre si está en el agente y encendida. */
export function accionEncendida(a: AccionDeAgente): boolean {
  return a.in_agent && a.enabled;
}

export type EstadoDeAccion = "encendida" | "por_superpoder" | "apagada";

/**
 * Cómo está la acción en el agente. Sin binding, la acción igual corre si la concede un superpoder que el agente declara
 * (D-67); un binding apagado la niega aunque la conceda un superpoder.
 */
export function estadoDeAccion(a: AccionDeAgente): EstadoDeAccion {
  if (a.in_agent) return a.enabled ? "encendida" : "apagada";
  return a.by_superpower ? "por_superpoder" : "apagada";
}
