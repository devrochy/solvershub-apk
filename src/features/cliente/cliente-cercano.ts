export interface Coordenada {
  latitud: number;
  longitud: number;
}

/** Distancia en km entre dos coordenadas (haversine). */
export function distanciaKm(a: Coordenada, b: Coordenada): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLng = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface ClienteConUbicacion {
  clienteId: string;
  nombre?: string;
  latitud?: number | null;
  longitud?: number | null;
}

/**
 * Devuelve el cliente más cercano a `desde` entre los que tienen coordenadas
 * (REQ-APK-002). `null` si ninguno está geolocalizado.
 */
export function clienteMasCercano<T extends ClienteConUbicacion>(
  clientes: T[],
  desde: Coordenada,
): T | null {
  let mejor: T | null = null;
  let mejorDistancia = Number.POSITIVE_INFINITY;
  for (const cliente of clientes) {
    if (typeof cliente.latitud !== "number" || typeof cliente.longitud !== "number") {
      continue;
    }
    const distancia = distanciaKm(desde, {
      latitud: cliente.latitud,
      longitud: cliente.longitud,
    });
    if (distancia < mejorDistancia) {
      mejor = cliente;
      mejorDistancia = distancia;
    }
  }
  return mejor;
}
