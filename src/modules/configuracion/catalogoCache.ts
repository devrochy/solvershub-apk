import { guardarAjuste, leerAjuste } from "@data/ajustes";
import type { ClienteAdmin } from "@core/api/admin";
import { cargarCatalogo, type CatalogoConfig } from "./api";

const CLAVE_CATALOGO = "catalogo_config";

/**
 * Catálogo de opciones con respaldo local: si la descarga falla (sin conexión, backend sin el
 * endpoint) se usa el último catálogo guardado en el teléfono; si no hay ninguno, `null` y la
 * pantalla avisa en vez de mostrar identificadores crudos.
 */
export async function catalogoConRespaldo(api: ClienteAdmin): Promise<CatalogoConfig | null> {
  try {
    const catalogo = await cargarCatalogo(api);
    await guardarAjuste(CLAVE_CATALOGO, JSON.stringify(catalogo)).catch(() => undefined);
    return catalogo;
  } catch {
    try {
      const guardado = await leerAjuste(CLAVE_CATALOGO);
      return guardado ? (JSON.parse(guardado) as CatalogoConfig) : null;
    } catch {
      return null;
    }
  }
}
