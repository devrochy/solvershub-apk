import { apiLogin } from "./auth";
import { TENANT } from "../config";

jest.mock("../features/dispositivo/dispositivo", () => ({
  imeiDelEquipo: jest.fn().mockResolvedValue("ANDROID-TEST"),
  leerWhatsappVinculacion: jest.fn().mockResolvedValue("3000000000"),
}));

describe("apiLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("llama al login de gestor por defecto", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", gestor: { id: "1" } }),
    });

    await apiLogin("c1", "pass");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/gestor/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tenant: TENANT, usuario: "c1", password: "pass", imei: "ANDROID-TEST", whatsapp: "3000000000" }),
      }),
    );
  });

  it("llama al login de propietario cuando el rol es propietario", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", propietario: { id: "2" } }),
    });

    await apiLogin("s1", "pass", "propietario");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/propietario/login",
      expect.objectContaining({
        body: JSON.stringify({ tenant: TENANT, usuario: "s1", password: "pass", imei: "ANDROID-TEST", whatsapp: "3000000000" }),
      }),
    );
  });

  it("lanza ApiError cuando el login falla", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    await expect(apiLogin("c1", "pass", "gestor")).rejects.toMatchObject({
      status: 401,
    });
  });
});