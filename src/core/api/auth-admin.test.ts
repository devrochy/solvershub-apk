import {
  ApiAuthError,
  apiGestorToken,
  apiLoginAdmin,
  apiMeAdmin,
  apiOlvidarContrasena,
  apiRestablecerContrasena,
} from "./auth-admin";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe("api admin (ADR-0094)", () => {
  it("login postea a /api/v1/auth/login y devuelve el token", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { token: "t-opaco", adminId: "a-1", expiresIn: 604800 }),
    );
    const result = await apiLoginAdmin("correo@x.com", "clave");
    expect(result.token).toBe("t-opaco");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/auth/login");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ identifier: "correo@x.com", password: "clave" });
  });

  it("login con 401 lanza ApiAuthError con el código del servidor", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: "invalid_credentials", message: "Mal." } }),
    );
    await expect(apiLoginAdmin("x", "y")).rejects.toMatchObject({
      status: 401,
      code: "invalid_credentials",
    });
  });

  it("me envía Bearer y X-Tenant-Id cuando hay negocio elegido", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { adminId: "a-1", email: "e", role: "owner", tenantCount: 1 }),
    );
    await apiMeAdmin("t-opaco", "t-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me");
    expect(init.headers.Authorization).toBe("Bearer t-opaco");
    expect(init.headers["X-Tenant-Id"]).toBe("t-1");
  });

  it("forgot-password respeta el 202 genérico y propaga errores reales", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, {}));
    await expect(apiOlvidarContrasena("correo@x.com")).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, { error: { code: "sync_error", message: "boom" } }),
    );
    await expect(apiOlvidarContrasena("correo@x.com")).rejects.toBeInstanceOf(ApiAuthError);
  });

  it("reset-password postea token y contraseña nueva (snake_case del /api/v1)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204, {}));
    await apiRestablecerContrasena("ABC123", "nueva-clave-123");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/auth/reset-password");
    expect(JSON.parse(init.body)).toEqual({
      token: "ABC123",
      new_password: "nueva-clave-123",
    });
  });

  it("gestor-token intercambia la sesión admin por tokens de campo", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        accessToken: "jwt-access",
        refreshToken: "jwt-refresh",
        rol: "gestor",
        tenantId: "t-1",
        requiereVinculacion: true,
        perfil: { id: "g-1", usuario: "u", nombre: "G", apellido: "" },
      }),
    );
    const result = await apiGestorToken("t-opaco", "t-1");
    expect(result.accessToken).toBe("jwt-access");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/pack/cobranza/gestor-token");
    expect(init.headers.Authorization).toBe("Bearer t-opaco");
    expect(init.headers["X-Tenant-Id"]).toBe("t-1");
    // El enforcement del dispositivo exige credenciales del equipo (ADR-0068).
    expect(JSON.parse(init.body)).toMatchObject({ imei: expect.any(String), whatsapp: expect.any(String) });
  });
});
