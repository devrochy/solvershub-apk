import { ApiError } from "./client";
import { authUrl } from "../config";
import type { EventoOffline } from "../offline/cola";

export const DEVICE_API_KEY_HEADER = "x-device-key";

interface AckEventoSync {
  eventoIdCliente: string;
  estado: "sincronizado" | "duplicado" | "error";
  error?: string;
}

/**
 * Envía la cola offline a `POST /sync-offline/eventos` autenticado por API key
 * de dispositivo. Devuelve los `eventoIdCliente` confirmados (sincronizado o
 * duplicado) para poder removerlos de la cola local.
 */
export async function sincronizarCola(
  eventos: EventoOffline[],
  apiKey: string,
): Promise<string[]> {
  if (eventos.length === 0) {
    return [];
  }
  const res = await fetch(authUrl("/sync-offline/eventos"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [DEVICE_API_KEY_HEADER]: apiKey,
    },
    body: JSON.stringify({
      eventos: eventos.map(({ eventoIdCliente, tipoEvento, payload }) => ({
        eventoIdCliente,
        tipoEvento,
        payload,
      })),
    }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => ""));
  }

  const acks = (await res.json()) as AckEventoSync[];
  return acks
    .filter((a) => a.estado === "sincronizado" || a.estado === "duplicado")
    .map((a) => a.eventoIdCliente);
}