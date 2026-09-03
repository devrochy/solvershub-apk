import { apiLogin } from "./auth";

describe("apiLogin", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("llama al login de cobrador por defecto", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", cobrador: { id: 1 } }),
    });

    await apiLogin("c1", "pass");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/cobrador/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ usuario: "c1", password: "pass" }),
      }),
    );
  });

  it("llama al login de socio cuando el rol es socio", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ accessToken: "a", refreshToken: "r", socio: { id: 2 } }),
    });

    await apiLogin("s1", "pass", "socio");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:3000/auth/socio/login",
      expect.objectContaining({
        body: JSON.stringify({ usuario: "s1", password: "pass" }),
      }),
    );
  });

  it("lanza ApiError cuando el login falla", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

    await expect(apiLogin("c1", "pass", "cobrador")).rejects.toMatchObject({
      status: 401,
    });
  });
});