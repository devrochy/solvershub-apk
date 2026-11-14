let mockId: string | null = "EQUIPO-DEMO";
jest.mock("expo-application", () => ({
  getAndroidId: () => mockId,
  getIosIdForVendorAsync: async () => mockId,
}));

import { reiniciarCacheDeEquipo } from "@shared/dispositivo";
import { suscribirAccesoDeEquipo, type CodigoDeEquipo } from "@shared/acceso-evento";
import { codigoDeError, fetchApi } from "./http";

const respuesta = (status: number, cuerpo?: unknown) =>
  ({
    status,
    ok: status < 400,
    clone() {
      return this;
    },
    json: async () => {
      if (cuerpo === undefined) throw new Error("sin cuerpo");
      return cuerpo;
    },
  }) as unknown as Response;

describe("fetchApi (HU-ACC-05)", () => {
  const emitidos: CodigoDeEquipo[] = [];
  let baja: () => void;
  beforeEach(() => {
    reiniciarCacheDeEquipo();
    emitidos.length = 0;
    baja = suscribirAccesoDeEquipo((c) => emitidos.push(c));
    global.fetch = jest.fn().mockResolvedValue(respuesta(200, {}));
  });
  afterEach(() => baja());

  it("añade X-Device-Id y conserva las cabeceras de la petición", async () => {
    await fetchApi("https://api.test/x", { method: "POST", headers: { Authorization: "Bearer t" } });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers).toEqual({ Authorization: "Bearer t", "X-Device-Id": "EQUIPO-DEMO" });
    expect(init.method).toBe("POST");
  });

  it("también lo lleva el refresh (sale por el mismo cliente)", async () => {
    await fetchApi("https://api.test/auth/refresh", { method: "POST", body: "{}" });
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers["X-Device-Id"]).toBe("EQUIPO-DEMO");
  });

  it("sin id del equipo no manda la cabecera", async () => {
    mockId = null;
    await fetchApi("https://api.test/x");
    mockId = "EQUIPO-DEMO";
    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toEqual({});
  });

  it.each([
    ["formato del core", { error: { code: "dispositivo_pendiente", message: "x" } }, "dispositivo_pendiente"],
    ["formato del pack", { error: "Dispositivo bloqueado", code: "dispositivo_bloqueado", estado: "bloqueado" }, "dispositivo_bloqueado"],
  ])("un 403 de equipo en el %s avisa a la app", async (_n, cuerpo, esperado) => {
    (global.fetch as jest.Mock).mockResolvedValue(respuesta(403, cuerpo));
    await fetchApi("https://api.test/x");
    expect(emitidos).toEqual([esperado]);
  });

  it("otro 403 o un 403 sin cuerpo no avisa", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(respuesta(403, { error: { code: "sin_acceso_campo" } }));
    await fetchApi("https://api.test/x");
    (global.fetch as jest.Mock).mockResolvedValueOnce(respuesta(403));
    await fetchApi("https://api.test/x");
    expect(emitidos).toEqual([]);
  });

  it("lee el code de los dos formatos", () => {
    expect(codigoDeError({ error: { code: "a" } })).toBe("a");
    expect(codigoDeError({ error: "texto", code: "b" })).toBe("b");
    expect(codigoDeError({ error: "texto" })).toBeNull();
    expect(codigoDeError(null)).toBeNull();
  });
});
