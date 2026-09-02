const DEFAULT_API_URL = "http://localhost:3000";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? DEFAULT_API_URL;

export const DEVICE_API_KEY = process.env.EXPO_PUBLIC_DEVICE_KEY ?? "";

export function authUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * Resuelve una ruta de archivo (p. ej. `/uploads/clientes/foto.jpg`) a una URL
 * absoluta del backend para usarla en <Image>. Si ya es una URL completa
 * (https://…), la devuelve tal cual. Si es vacía/null, devuelve null.
 */
export function urlArchivo(ruta: string | null | undefined): string | null {
  if (!ruta) {
    return null;
  }
  if (ruta.startsWith("http://") || ruta.startsWith("https://")) {
    return ruta;
  }
  return `${API_URL}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}