import { Linking } from "react-native";
import type { TrayectoPublic } from "@shared/types/gestor";

export interface Coordenada {
  latitud: number;
  longitud: number;
}

/**
 * Busca la parada de un cliente en los trayectos planificados del día
 * (HU-37/59). El trayecto expone `ordenClientes` con latitud/longitud por
 * cliente; si el cliente no tiene coordenadas o no hay trayectos, devuelve null.
 */
export function coordenadaDeCliente(
  trayectos: TrayectoPublic | null,
  clienteId: string,
): Coordenada | null {
  if (!trayectos) {
    return null;
  }
  for (const trayecto of trayectos.ordenClientes) {
    for (const parada of trayecto) {
      if (
        parada.clienteId === clienteId &&
        typeof parada.latitud === "number" &&
        typeof parada.longitud === "number"
      ) {
        return { latitud: parada.latitud, longitud: parada.longitud };
      }
    }
  }
  return null;
}

/** Enlace universal de Google Maps a una dirección (sin origen: desde la ubicación actual). */
export function enlaceGoogleMaps(latitud: number, longitud: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;
}

/**
 * Enlace de Google Maps con el orden estricto de un trayecto (HU-37): la
 * primera parada es el destino y el resto viaja como waypoints en orden.
 * Devuelve null si no hay al menos una parada con coordenadas.
 */
export function enlaceGoogleMapsCartera(
  paradas: { latitud?: number; longitud?: number }[],
): string | null {
  const conCoords = paradas.filter(
    (p) => typeof p.latitud === "number" && typeof p.longitud === "number",
  ) as { latitud: number; longitud: number }[];
  if (conCoords.length === 0) {
    return null;
  }
  const [destino, ...waypoints] = conCoords;
  const base = `https://www.google.com/maps/dir/?api=1&destination=${destino.latitud},${destino.longitud}`;
  if (waypoints.length === 0) {
    return base;
  }
  const params = waypoints
    .map((p) => `${p.latitud},${p.longitud}`)
    .join("|");
  return `${base}&waypoints=${params}`;
}

/** Enlace universal de Waze con navegación a una ubicación. */
export function enlaceWaze(latitud: number, longitud: number): string {
  return `https://waze.com/ul?ll=${latitud},${longitud}&navigate=yes`;
}

export type AppNavegacion = "maps" | "waze";

/**
 * Abre la navegación externa (Google Maps o Waze) hacia la ubicación del
 * cliente usando Linking. No requiere dependencias de mapa.
 */
export async function abrirNavegacion(
  latitud: number,
  longitud: number,
  app: AppNavegacion,
): Promise<void> {
  const url =
    app === "waze"
      ? enlaceWaze(latitud, longitud)
      : enlaceGoogleMaps(latitud, longitud);
  await Linking.openURL(url);
}