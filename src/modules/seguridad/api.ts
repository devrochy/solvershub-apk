import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";
import type { AccionDispositivo, EstadoDispositivo, EventoAcceso, PoliticaAcceso } from "./reglas";

export type PaginaDeDispositivos = components["schemas"]["AccessDevicePage"];
export type PaginaDeEventos = components["schemas"]["AccessEventPage"];

export function cargarDispositivos(
  cliente: ClienteAdmin,
  estado?: EstadoDispositivo,
  cursor?: string | null,
): Promise<PaginaDeDispositivos> {
  return cliente.get<PaginaDeDispositivos>("/access/devices", { estado, cursor, limit: 30 });
}

export function cargarEventos(
  cliente: ClienteAdmin,
  severidad?: EventoAcceso["severidad"],
  cursor?: string | null,
): Promise<PaginaDeEventos> {
  return cliente.get<PaginaDeEventos>("/access/events", { severidad, cursor, limit: 30 });
}

export function cargarPolitica(cliente: ClienteAdmin): Promise<PoliticaAcceso> {
  return cliente.get<PoliticaAcceso>("/access/policy");
}

/** Cada acción manda el estado que se veía: si cambió mientras tanto, la API responde 409. */
export function ejecutarAccion(
  cliente: ClienteAdmin,
  id: string,
  accion: AccionDispositivo,
  esperado: EstadoDispositivo,
): Promise<unknown> {
  const ruta = accion === "reactivar" ? "aprobar" : accion;
  const cuerpo = accion === "bloquear" ? { esperado, alcance: "cuenta" } : { esperado };
  return cliente.post(`/access/devices/${id}/${ruta}`, cuerpo);
}
