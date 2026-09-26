import { ApiError } from "./client";
import { authUrl } from "../config";
import type { EventoOffline } from "../offline/cola";

export interface AckEventoSync {
  eventoIdCliente: string;
  estado: "sincronizado" | "duplicado" | "error";
  error?: string;
}

/**
 * Envía la cola offline a `POST /sync-offline/eventos` autenticado con el
 * **access token del gestor** (Bearer). Devuelve el **ack por evento**
 * (`sincronizado`/`duplicado`/`error`) para remover los confirmados y exponer los errores.
 */
export async function sincronizarCola(
  eventos: EventoOffline[],
  accessToken: string,
): Promise<AckEventoSync[]> {
  if (eventos.length === 0) {
    return [];
  }
  const res = await fetch(authUrl("/sync-offline/eventos"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
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

  return (await res.json()) as AckEventoSync[];
}
