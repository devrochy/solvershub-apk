import { apiInvitaciones, apiLogin, apiResolverInvitacion } from "./auth";

jest.mock("@shared/dispositivo", () => ({
  imeiDelEquipo: jest.fn().mockResolvedValue("ANDROID-TEST"),
  leerWhatsappVinculacion: jest.fn().mockResolvedValue("3000000000"),
  cabeceraDeEquipo: jest.fn().mockResolvedValue({}),
}));

describe("apiLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("pega al login unificado sin tenant", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", rol: "gestor" }),
    });

    await apiLogin("c1", "pass");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          usuario: "c1",
          password: "pass",
          imei: "ANDROID-TEST",
          whatsapp: "3000000000",
        }),
      }),
    );
  });

  it("incluye el tenant al elegir negocio", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", rol: "gestor" }),
    });

    await apiLogin("c1", "pass", "acme");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({
        body: JSON.stringify({
          usuario: "c1",
          password: "pass",
          tenant: "acme",
          imei: "ANDROID-TEST",
          whatsapp: "3000000000",
        }),
      }),
    );
  });

  it("devuelve la lista de negocios cuando se requiere selección", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        seleccionRequerida: true,
        negocios: [{ slug: "a", nombre: "A", rol: "gestor" }],
      }),
    });

    const result = await apiLogin("c1", "pass");
    expect(result.seleccionRequerida).toBe(true);
    expect(result.negocios).toHaveLength(1);
  });

  it("lanza ApiError cuando el login falla", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    await expect(apiLogin("c1", "pass")).rejects.toMatchObject({ status: 401 });
  });
});

describe("invitaciones", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("lista las invitaciones con el token", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [{ id: "1", slug: "a", nombre: "A", rol: "colaborador" }],
    });

    const invitaciones = await apiInvitaciones("tok");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/invitaciones",
      expect.objectContaining({ headers: { Authorization: "Bearer tok" } }),
    );
    expect(invitaciones).toHaveLength(1);
  });

  it("acepta una invitación", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await apiResolverInvitacion("tok", "1", "aceptar");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/invitaciones/1/aceptar",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
