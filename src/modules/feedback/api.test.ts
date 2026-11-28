jest.mock("@core/api/multipart", () => ({
  construirMultipart: jest.fn(async () => ({ body: new Uint8Array([1]), boundary: "LIMITE" })),
}));

import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
import { construirMultipart } from "@core/api/multipart";
import type { AdminSesion } from "@core/session/types";
import { EnvioError, enviarReporte, leerCatalogo } from "./api";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const SESION: AdminSesion = {
  token: "t-opaco",
  adminId: "a-1",
  email: "dueno@x.test",
  role: "owner",
  tenantId: "t-1",
  tenantName: "Negocio",
  permissions: {},
};
const DATOS = { tipo: "error" as const, area: "agenda", titulo: "No carga", descripcion: "La agenda no carga el martes." };

function respuesta(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: async () => body,
    clone() {
      return this;
    },
  } as unknown as Response;
}

beforeEach(() => fetchMock.mockReset());

describe("enviarReporte (HU-FB-07)", () => {
  it("manda multipart con Idempotency-Key, tenant y las imágenes como `adjuntos`", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(201, { id: "r-1" }));
    const r = await enviarReporte(SESION, DATOS, [{ uri: "file:///a.jpg", name: "captura-1.jpg", type: "image/jpeg" }], "clave-123456");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/feedback/reports");
    expect(init.method).toBe("POST");
    expect(init.headers["Idempotency-Key"]).toBe("clave-123456");
    expect(init.headers["X-Tenant-Id"]).toBe("t-1");
    expect(init.headers["Content-Type"]).toBe("multipart/form-data; boundary=LIMITE");
    expect(construirMultipart).toHaveBeenCalledWith(
      { tipo: "error", area: "agenda", titulo: "No carga", descripcion: "La agenda no carga el martes." },
      [{ campo: "adjuntos", uri: "file:///a.jpg", name: "captura-1.jpg", type: "image/jpeg" }],
    );
    expect(r).toEqual({ reporte: { id: "r-1" }, replay: false });
  });

  it("un 200 es el replay del reporte original", async () => {
    fetchMock.mockResolvedValueOnce(respuesta(200, { id: "r-1" }));
    await expect(enviarReporte(SESION, DATOS, [], "clave-123456")).resolves.toEqual({ reporte: { id: "r-1" }, replay: true });
  });

  it("un 429 trae el código y el Retry-After en segundos", async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta(429, { error: { code: "demasiados_reportes", message: "Muchos" } }, { "retry-after": "1800" }),
    );
    const error = await enviarReporte(SESION, DATOS, [], "clave-123456").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EnvioError);
    expect((error as EnvioError).code).toBe("demasiados_reportes");
    expect((error as EnvioError).reintentarEnSeg).toBe(1800);
  });

  it("sin red el error de fetch sale tal cual (el llamador reintenta con la misma clave)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(enviarReporte(SESION, DATOS, [], "clave-123456")).rejects.toBeInstanceOf(TypeError);
  });
});

describe("leerCatalogo", () => {
  it("un 404 es la bandera apagada: devuelve null", async () => {
    const api = { get: jest.fn().mockRejectedValue(new AdminApiError(404, "not_found", "No")) } as unknown as ClienteAdmin;
    await expect(leerCatalogo(api)).resolves.toBeNull();
  });

  it("otros errores se propagan", async () => {
    const api = { get: jest.fn().mockRejectedValue(new AdminApiError(500, "x", "x")) } as unknown as ClienteAdmin;
    await expect(leerCatalogo(api)).rejects.toBeInstanceOf(AdminApiError);
  });
});
