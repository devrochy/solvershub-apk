/**
 * Bienvenida de primer uso en 5 estaciones (HU-APP-23, SPEC-49; mismo guion que `lib/onboarding.ts` del panel,
 * HU-UX-25). Lógica pura: estaciones, decisiones visuales y su traducción a lo que guarda la API. El estado del
 * recorrido y que esté «completo» los decide el servidor (`/admin/onboarding`, HU-AOS-84); aquí solo se arma lo
 * que el dueño elige con clics. Cómo habla y el horario quedan con lo sugerido y se ajustan en Personalizar.
 */
import type { components } from "@core/api/schema";
import {
  NOMBRE_AGENTE_MAX,
  NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  ideasDeNombre,
  type TipoDeNegocio,
} from "@shared/ruta-de-lanzamiento";

export type Recorrido = components["schemas"]["RecorridoOut"];
export type IdentitySettings = components["schemas"]["IdentitySettings"];
export type { TipoDeNegocio };
export { NOMBRE_AGENTE_MAX, NOMBRE_SUGERIDO_DE_LA_BIENVENIDA };

/**
 * 1 Tu negocio (escribe en la identidad del negocio; al salir nace el agente), 2 Habilidades, 3 Datos del
 * cliente, 4 Datos para probar y 5 Revisar y publicar. Antes fueron 6 en la APK: el servidor traduce lo
 * guardado al leerlo y `avanzar` manda `pasos: 5` (HU-AOS-84).
 */
export const TOTAL_PASOS = 5;

export const PASOS = [
  { id: "negocio", titulo: "Cuéntanos de tu negocio", corto: "Tu negocio" },
  { id: "habilidades", titulo: "¿Qué sabe hacer {nombre}?", corto: "Habilidades" },
  { id: "datos-cliente", titulo: "¿Qué datos pide {nombre}?", corto: "Datos del cliente" },
  { id: "datos-probar", titulo: "Datos para probar", corto: "Datos para probar" },
  { id: "revisar", titulo: "La última vuelta antes de atender", corto: "Revisar y publicar" },
] as const;

export type IdDePaso = (typeof PASOS)[number]["id"];

/** El título de la estación con el nombre del agente; «Datos para probar» va por tipo (tableros `rb4`). */
export function tituloDelPaso(id: IdDePaso, nombre: string, tipo: TipoDeNegocio | null): string {
  const quien = nombre.trim() || "tu agente";
  if (id === "datos-probar") {
    if (tipo === "ventas") return `Dale a ${quien} algo que vender`;
    if (tipo === "agenda") return `¿Qué citas agenda ${quien}?`;
    return `¿Con qué datos probamos a ${quien}?`;
  }
  return (PASOS.find((p) => p.id === id)?.titulo ?? "").replace("{nombre}", quien);
}

/** Bajada de cada estación, debajo de la pregunta. */
export const BAJADA_DEL_PASO: Record<IdDePaso, string> = {
  negocio: "Con esto tu agente sabe quién es y cómo presentarse en su primera conversación.",
  habilidades: "Viene con lo recomendado para tu tipo de negocio. Cambia lo que quieras.",
  "datos-cliente": "Lo que le pregunta a cada cliente para atenderlo. Viene con lo justo.",
  "datos-probar": "Datos de ejemplo para probar cómo responde en el chat. Puedes seguir sin cargar nada.",
  revisar: "Revisa lo que configuraste y escríbele una vez como cliente.",
};

/** Lo que pide el paso 1: los datos del negocio y la identidad del agente. */
export const PARTES_DEL_PASO_1 = ["negocio", "identidad"] as const;
type ParteDelPaso1 = (typeof PARTES_DEL_PASO_1)[number];

/** Cómo se traduce un paso guardado con 4 (HU-AOS-81) a la escala de 5: «Datos para probar» era el 3. */
const PASO_DE_4_A_5: Readonly<Record<number, number>> = { 1: 1, 2: 2, 3: 4, 4: 5 };
/** De 9 (HU-UX-23) a 4; de ahí, a 5. */
const PASO_DE_9_A_4: Readonly<Record<number, number>> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 3, 8: 4, 9: 4 };

/**
 * El paso del recorrido en la escala de 5 (1 a 5). El servidor ya lo traduce (HU-AOS-84) y manda
 * `total_pasos: 5`; si llega uno guardado con 4 o con 9, se traduce igual que allá.
 */
export function pasoDeCinco(recorrido: Pick<Recorrido, "paso" | "total_pasos">): number {
  const paso = Math.max(Math.trunc(recorrido.paso) || 1, 1);
  if (recorrido.total_pasos === 4) return PASO_DE_4_A_5[Math.min(paso, 4)];
  if (recorrido.total_pasos === 9) return PASO_DE_4_A_5[PASO_DE_9_A_4[Math.min(paso, 9)]];
  return Math.min(paso, TOTAL_PASOS);
}

// --------------------------------------------------------------------------- tipo de negocio

/** El tipo que viene elegido en la bienvenida, con la etiqueta «Recomendado». */
export const TIPO_RECOMENDADO: TipoDeNegocio = "ventas";

export const TIPOS_DE_NEGOCIO: {
  id: TipoDeNegocio;
  titulo: string;
  /** Ayuda corta, de una línea, bajo el título de la tarjeta. */
  ayuda: string;
  /**
   * Frase sugerida para «Tu negocio en una frase». Es genérica: nunca un dato inventado del negocio (zona,
   * productos o precios). Se reemplaza al cambiar de tipo solo si el dueño no la editó.
   */
  frase: string;
  nombres: string[];
}[] = [
  {
    id: "ventas",
    titulo: "Vendo productos",
    ayuda: "Cotiza y toma el pedido.",
    frase: "Vendemos nuestros productos por WhatsApp y tomamos pedidos para recoger o a domicilio.",
    nombres: ["Sofía", "Vera", "Mateo"],
  },
  {
    id: "agenda",
    titulo: "Agendo citas",
    ayuda: "Ofrece horarios y reserva.",
    frase: "Atendemos con cita previa y agendamos, cambiamos o cancelamos citas por WhatsApp.",
    nombres: ["Tomás", "Luna", "Dani"],
  },
  {
    id: "cobranza",
    titulo: "Cobro cartera",
    ayuda: "Recuerda pagos y promesas.",
    frase: "Damos crédito a nuestros clientes y les recordamos sus pagos por WhatsApp.",
    nombres: ["Clara", "Cobros", "Nico"],
  },
  {
    id: "suscripciones",
    titulo: "Vendo y gestiono planes",
    ayuda: "Contrata planes y atiende.",
    frase: "Ofrecemos planes con pago periódico y atendemos a nuestros suscriptores por WhatsApp.",
    nombres: ["Alma", "Planes", "Leo"],
  },
];

/** Ideas de nombre de la bienvenida: «Laura» primero y luego las del tipo, sin nombres de función. */
export function ideasDeLaBienvenida(tipo: TipoDeNegocio | null, cuantas = 3): string[] {
  const delTipo = TIPOS_DE_NEGOCIO.find((t) => t.id === tipo)?.nombres ?? [];
  return ideasDeNombre(NOMBRE_SUGERIDO_DE_LA_BIENVENIDA, null, cuantas, delTipo);
}

/** La frase sugerida del tipo (vacía si no hay tipo). */
export function fraseDelTipo(tipo: TipoDeNegocio | null): string {
  return TIPOS_DE_NEGOCIO.find((t) => t.id === tipo)?.frase ?? "";
}

// ------------------------------------------------------------------------------- el estado

export type Largo = "cortas" | "normal" | "detalladas";

export type EstadoDelAsistente = {
  tipo: TipoDeNegocio | null;
  negocio: string;
  descripcion: string;
  nombreDelAgente: string;
  /** Respuesta del guion de la plantilla (`largo_respuesta`); va con lo sugerido. */
  largo: Largo;
};

/** Llega con lo recomendado por SolversHub: «Vendo productos», «Laura» y la frase del tipo. */
export const ESTADO_INICIAL: EstadoDelAsistente = {
  tipo: TIPO_RECOMENDADO,
  negocio: "",
  descripcion: fraseDelTipo(TIPO_RECOMENDADO),
  nombreDelAgente: NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  largo: "normal",
};

/**
 * Elige un tipo de negocio. La frase sigue al tipo mientras el dueño no la haya editado (vacía o igual a la
 * sugerida del tipo anterior); lo escrito por él se respeta.
 */
export function conTipo(estado: EstadoDelAsistente, tipo: TipoDeNegocio): EstadoDelAsistente {
  const sinEditar = estado.descripcion.trim() === "" || estado.descripcion === fraseDelTipo(estado.tipo);
  return { ...estado, tipo, descripcion: sinEditar ? fraseDelTipo(tipo) : estado.descripcion };
}

/** El estado con lo recomendado por SolversHub en la estación 1 (tipo, nombre y frase), sin tocar el negocio. */
export function conLoRecomendado(estado: EstadoDelAsistente, tipo: TipoDeNegocio = TIPO_RECOMENDADO): EstadoDelAsistente {
  return { ...estado, tipo, nombreDelAgente: NOMBRE_SUGERIDO_DE_LA_BIENVENIDA, descripcion: fraseDelTipo(tipo) };
}

/**
 * Lo que se compara con lo recomendado en la estación 1 (tablero `rb1`): el tipo, el nombre y la frase. La frase
 * cuenta como recomendada mientras sea la sugerida de su tipo: cambiar el tipo es un cambio, no dos.
 */
export function valoresDelPaso1(estado: EstadoDelAsistente): Record<string, string | null> {
  const sugerida = estado.descripcion === fraseDelTipo(estado.tipo);
  return { tipo: estado.tipo, nombre: estado.nombreDelAgente.trim(), frase: sugerida ? "sugerida" : estado.descripcion };
}

export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 600;

/** Mensaje de error de una parte del paso 1, o `undefined` si se puede avanzar. */
export function errorDelPaso(id: ParteDelPaso1, estado: EstadoDelAsistente): string | undefined {
  if (id === "negocio") {
    if (!estado.tipo) return "Elige a qué se dedica tu negocio.";
    if (!estado.negocio.trim()) return "Escribe cómo se llama tu negocio.";
    if (estado.descripcion.trim().length < DESCRIPCION_MIN) return "Cuéntanos en una frase a qué se dedica tu negocio.";
    if (estado.descripcion.trim().length > DESCRIPCION_MAX) return `Máximo ${DESCRIPCION_MAX} caracteres.`;
  }
  if (id === "identidad") {
    if (!estado.nombreDelAgente.trim()) return "Ponle un nombre a tu agente.";
    if (estado.nombreDelAgente.trim().length > NOMBRE_AGENTE_MAX) return `Máximo ${NOMBRE_AGENTE_MAX} caracteres.`;
  }
  return undefined;
}

/** El primer error del paso 1, o `undefined`. */
export function errorDelPaso1(estado: EstadoDelAsistente): string | undefined {
  return PARTES_DEL_PASO_1.map((id) => errorDelPaso(id, estado)).find(Boolean);
}

/** Tipo de negocio → clave de plantilla de agente (SPEC-39). */
export function plantillaDe(tipo: TipoDeNegocio): string {
  return tipo;
}

/** Respuestas de `POST /admin/agents/from-script` según lo elegido. */
export function respuestasDeCreacion(estado: EstadoDelAsistente): Record<string, string> {
  return { largo_respuesta: estado.largo };
}

/** Cambios que la estación 1 guarda en Configuración › Identidad (el servidor une con lo que ya hay). */
export type CambiosDeIdentidad = Partial<Pick<IdentitySettings, "assistant_name" | "business_description">>;

export function cambiosDelPaso1(estado: EstadoDelAsistente): CambiosDeIdentidad {
  return {
    business_description: [estado.negocio.trim(), estado.descripcion.trim()].filter(Boolean).join(". "),
    assistant_name: estado.nombreDelAgente.trim(),
  };
}

/** Estado inicial a partir de lo ya guardado en Identidad, para retomar donde se quedó. */
export function estadoDesdeIdentidad(
  identidad: Pick<IdentitySettings, "assistant_name" | "business_description">,
  base: EstadoDelAsistente = ESTADO_INICIAL,
): EstadoDelAsistente {
  const nombre = identidad.assistant_name?.trim();
  const negocio = base.negocio.trim();
  let descripcion = identidad.business_description?.trim() ? identidad.business_description : base.descripcion;
  // La identidad guarda «negocio. frase»; al retomar se muestra la frase sola.
  if (negocio && descripcion.startsWith(`${negocio}. `)) descripcion = descripcion.slice(negocio.length + 2);
  return {
    ...base,
    // El alta pone el nombre del negocio (o «Asistente») como nombre del asistente: no es una elección.
    nombreDelAgente: nombre && nombre !== "Asistente" && nombre !== negocio ? nombre : base.nombreDelAgente,
    descripcion,
  };
}

// ------------------------------------------------------------------------ aviso y progreso

/** Estaciones que faltan para terminar (de 5), para el texto del aviso. */
export function pasosQueFaltan(recorrido: Recorrido): number {
  if (recorrido.estado === "completo" || !recorrido.aplica) return 0;
  return Math.max(TOTAL_PASOS - Math.max(pasoDeCinco(recorrido) - 1, 0), 1);
}

/** El aviso persistente cuenta las estaciones que faltan de 5. */
export function textoDelAviso(recorrido: Recorrido): string {
  const faltan = pasosQueFaltan(recorrido);
  return faltan === 1
    ? `Tu agente aún no está listo para responder. Falta 1 de ${TOTAL_PASOS} pasos.`
    : `Tu agente aún no está listo para responder. Faltan ${faltan} de ${TOTAL_PASOS} pasos.`;
}

export function textoDeAvance(paso: number): string {
  return `Paso ${paso} de ${TOTAL_PASOS}`;
}

/** «Seguir después»: la confirmación dice qué pasa y que lo hecho no se pierde. */
export function textosDeSeguirDespues(nombreDelAgente: string): { titulo: string; detalle: string } {
  return {
    titulo: `${nombreDelAgente.trim() || "Tu agente"} no atiende hasta que termines.`,
    detalle: "Lo que llevas queda guardado y retomas aquí desde Inicio.",
  };
}

/** Texto del botón del aviso: retomar si ya había empezado, empezar si no. */
export function accionDelAviso(recorrido: Recorrido): string {
  return recorrido.paso > 1 || recorrido.estado === "en_curso" ? "Continuar" : "Empezar";
}

// ---------------------------------------------------------------------------- dejar listo

export type SubPaso = {
  clave: "conexion" | "publicar" | "activar";
  estado: "hecho" | "ya_estaba" | "pendiente_de_revision";
};

/** Frases sugeridas para el chat de prueba real, según el tipo de negocio. */
export const FRASES_DE_PRUEBA: Record<TipoDeNegocio, string[]> = {
  ventas: ["Hola, ¿qué venden?", "¿Cuánto cuesta y cómo puedo pagar?", "Quiero hacer un pedido"],
  agenda: ["Hola, quiero agendar una cita", "¿Qué horarios tienen disponibles?", "Necesito cancelar mi cita"],
  cobranza: ["Hola, ¿cuánto debo?", "No puedo pagar esta semana", "¿Cómo pago mi cuota?"],
  suscripciones: ["Hola, ¿qué planes tienen?", "Quiero cambiar mi plan", "¿Cuándo es mi próximo cobro?"],
};

/** Lo que falta para terminar (`faltan_pasos` de `finalizar`), en palabras del dueño. */
export const FALTA_PARA_TERMINAR: Record<string, string> = {
  datos_negocio: "Falta contar de tu negocio.",
  agente: "Falta crear tu agente.",
  agente_publicado: "Falta dejar tu agente listo para probar.",
  prueba: "Falta probar a tu agente: escríbele un mensaje.",
};
