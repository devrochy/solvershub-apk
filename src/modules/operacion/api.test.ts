import type { ClienteAdmin } from "@core/api/admin";
import {
  confirmarEnvio,
  corregirPerfilDelCliente,
  exportarLeadsCsv,
  geocodificarCliente,
  listarLeads,
} from "./api";

function apiFalsa() {
  const get = jest.fn().mockResolvedValue({ items: [], page: 1, total: 0, has_more: false });
  const post = jest.fn().mockResolvedValue({});
  const patch = jest.fn().mockResolvedValue({});
  const getTexto = jest.fn().mockResolvedValue({ texto: "Cliente,Canal", nombreArchivo: "clientes.csv" });
  const api = { get, post, put: jest.fn(), patch, del: jest.fn(), getTexto } as unknown as ClienteAdmin;
  return { api, get, post, patch, getTexto };
}

describe("API de Clientes (CRM)", () => {
  it("envía los filtros de la lista, incluidos los de los packs", async () => {
    const { api, get } = apiFalsa();
    await listarLeads(api, {
      q: "juana",
      channel: "whatsapp",
      connection_id: "cx-1",
      filtros: ["clasificacion:vip"],
      page: 2,
    });
    expect(get).toHaveBeenCalledWith("/admin/leads", {
      q: "juana",
      channel: "whatsapp",
      connection_id: "cx-1",
      filtro: ["clasificacion:vip"],
      page: 2,
      page_size: 20,
    });
  });

  it("descarga el CSV con los filtros", async () => {
    const { api, getTexto } = apiFalsa();
    await exportarLeadsCsv(api, { q: "ana", channel: "whatsapp" });
    expect(getTexto).toHaveBeenCalledWith("/admin/leads/export.csv", {
      q: "ana",
      channel: "whatsapp",
      connection_id: undefined,
      filtro: undefined,
    });
  });

  it("corrige el perfil con valores y otros datos", async () => {
    const { api, patch } = apiFalsa();
    await corregirPerfilDelCliente(api, "c-1", { address: "Calle 1" }, { empresa: "ACME" });
    expect(patch).toHaveBeenCalledWith("/admin/leads/c-1/perfil", {
      valores: { address: "Calle 1" },
      otros: { empresa: "ACME" },
    });
  });

  it("geocodifica y confirma un envío con la clave de idempotencia", async () => {
    const { api, post } = apiFalsa();
    await geocodificarCliente(api, "c-1");
    expect(post).toHaveBeenCalledWith("/admin/leads/c-1/geocodificar");

    await confirmarEnvio(api, "env-1", "clave-123");
    expect(post).toHaveBeenCalledWith(
      "/admin/leads/acciones/plantilla/env-1/confirmar",
      undefined,
      { "Idempotency-Key": "clave-123" },
    );
  });
});
