import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Chats ya vistos en este dispositivo (bandeja de conversaciones).
 *
 * El backend calcula `pending_count` como «mensajes del cliente posteriores a la última
 * respuesta entregada» y solo lo limpia al responder. Para que la píldora desaparezca al
 * abrir el chat, se guarda aquí la última actividad vista. La píldora vuelve cuando llega
 * actividad más nueva que esa marca.
 */
export const CLAVE_VISTOS = "conversaciones:vistos:v1";
const LIMITE = 200;

export type Vistos = Record<string, string>;

type ChatConActividad = {
  id: string;
  last_message_at?: string | null;
  started_at: string;
};

/** Actividad del chat con el mismo criterio de orden de la bandeja. */
export function actividadDelChat(chat: ChatConActividad): string {
  return chat.last_message_at ?? chat.started_at;
}

/** Deja solo las marcas más recientes: el registro no crece sin fin. */
export function podarVistos(vistos: Vistos, limite = LIMITE): Vistos {
  const ordenados = Object.entries(vistos).sort((a, b) => b[1].localeCompare(a[1]));
  return Object.fromEntries(ordenados.slice(0, limite));
}

/** Marca el chat como visto en la actividad dada (no retrocede si ya había una más nueva). */
export function marcarVisto(vistos: Vistos, id: string, actividad: string): Vistos {
  const anterior = vistos[id];
  if (anterior && Date.parse(anterior) >= Date.parse(actividad)) return vistos;
  return podarVistos({ ...vistos, [id]: actividad });
}

/** ¿La actividad actual del chat ya se vio en este dispositivo? */
export function estaVisto(vistos: Vistos, chat: ChatConActividad): boolean {
  const marca = vistos[chat.id];
  if (!marca) return false;
  return Date.parse(marca) >= Date.parse(actividadDelChat(chat));
}

/** Lee el JSON guardado; un valor corrupto se trata como vacío. */
export async function leerVistos(): Promise<Vistos> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_VISTOS);
    if (!crudo) return {};
    const valor = JSON.parse(crudo) as unknown;
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
    return Object.fromEntries(
      Object.entries(valor as Record<string, unknown>).filter(
        (entrada): entrada is [string, string] => typeof entrada[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export async function guardarVistos(vistos: Vistos): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_VISTOS, JSON.stringify(vistos));
  } catch {
    /* sin persistencia: la píldora vuelve en la próxima carga */
  }
}
