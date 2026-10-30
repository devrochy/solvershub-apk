let mockId: string | null = "EQUIPO-DEMO";
jest.mock("expo-application", () => ({
  getAndroidId: () => mockId,
  getIosIdForVendorAsync: async () => mockId,
}));

import { reiniciarCacheDeEquipo } from "@shared/dispositivo";
import { consultarEquipo, EQUIPO_ABIERTO } from "./acceso";

const ok = (cuerpo: unknown) => ({ ok: true, status: 200, clone() { return this; }, json: async () => cuerpo }) as unknown as Response;

describe("consultarEquipo (HU-ACC-05)", () => {
  beforeEach(() => {
    reiniciarCacheDeEquipo();
    global.fetch = jest.fn();
  });

  it("registra el equipo con su id, etiqueta y plataforma en el negocio activo", async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      ok({ estado: "pendiente", permitido: false, politica: "restringido", requiereVinculacion: true }),
    );
    const estado = await consultarEquipo("tok", "t-1");
    expect(estado.permitido).toBe(false);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/access\/device-session$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok", "X-Tenant-Id": "t-1", "X-Device-Id": "EQUIPO-DEMO" });
    expect(JSON.parse(init.body)).toMatchObject({ deviceId: "EQUIPO-DEMO", plataforma: expect.stringMatching(/android|ios/) });
  });

  it("un backend sin la ruta (404) se trata como política abierta", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404, clone() { return this; }, json: async () => ({}) });
    expect(await consultarEquipo("tok", "t-1")).toEqual(EQUIPO_ABIERTO);
  });

  it("sin id del equipo (web) ni siquiera consulta", async () => {
    mockId = null;
    try {
      expect(await consultarEquipo("tok", "t-1")).toEqual(EQUIPO_ABIERTO);
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      mockId = "EQUIPO-DEMO";
    }
  });

  it("otro error del servidor se propaga para que el llamador decida", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      clone() { return this; },
      json: async () => ({ error: { code: "boom", message: "Falla" } }),
    });
    await expect(consultarEquipo("tok", "t-1")).rejects.toMatchObject({ status: 500, code: "boom" });
  });
});
