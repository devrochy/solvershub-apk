const DEFAULT_API_URL = "http://localhost:3000";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? DEFAULT_API_URL;

/**
 * Slug del tenant de agent-core (multi-tenant). El login no traía identificador
 * de tenant; el pack lo exige (ADR-0065). En el backend NestJS anterior no aplica.
 */
export const TENANT = process.env.EXPO_PUBLIC_TENANT ?? "";

export const DEVICE_API_KEY = process.env.EXPO_PUBLIC_DEVICE_KEY ?? "";

export function authUrl(path: string): string {
  return `${API_URL}${path}`;
}

/**
 * Resuelve una cartera de archivo (p. ej. `/uploads/clientes/foto.jpg`) a una URL
 * absoluta del backend para usarla en <Image>. Si ya es una URL completa
 * (https://…), la devuelve tal cual. Si es un path absoluto del filesystem del
 * backend (p. ej. `/Users/.../uploads/...` de cachés viejas), extrae la parte
 * servible `/uploads/...`. Si es vacía/null, devuelve null.
 */
export function urlArchivo(cartera: string | null | undefined): string | null {
  if (!cartera) {
    return null;
  }
  if (cartera.startsWith("http://") || cartera.startsWith("https://")) {
    return cartera;
  }
  const servible = cartera.includes("/uploads/")
    ? cartera.slice(cartera.indexOf("/uploads/"))
    : cartera;
  return `${API_URL}${servible.startsWith("/") ? servible : `/${servible}`}`;
}