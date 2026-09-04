import { ApiClient, ApiError, SessionGateway, esErrorDeRed } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function token(expSec: number): string {
  const enc = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${enc({ alg: "none" })}.${enc({
    sub: 1,
    rol: "cobrador",
    tipo: "access",
    exp: expSec,
  })}.sig`;
}

function vigente(): string {
  return token(Math.floor(Date.now() / 1000) + 3600);
}

describe("ApiClient", () => {
  let client: ApiClient;
  let gateway: SessionGateway;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    gateway = {
      getTokens: jest.fn(),
      saveTokens: jest.fn(),
      clear: jest.fn(),
    };
    client = new ApiClient(gateway);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("adjunta el Bearer y devuelve el JSON", async () => {
    (gateway.getTokens as jest.Mock).mockResolvedValue({
      accessToken: vigente(),
      refreshToken: "r1",
    });
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    const result = await client.request<{ ok: boolean }>("/cobrador/mis-rutas");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/cobrador/mis-rutas",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: `Bearer ${vigente()}` }),
      }),
    );
  });

  it("lanza ApiError con el status si la respuesta no es ok", async () => {
    (gateway.getTokens as jest.Mock).mockResolvedValue({
      accessToken: vigente(),
      refreshToken: "r1",
    });
    fetchMock.mockResolvedValue(new Response("Acceso denegado", { status: 403 }));

    await expect(client.request("/cobrador/rutas/1/dia")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("refresca el access expirado antes de llamar", async () => {
    const expired =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEsInJvbCI6ImNvYnJhZG9yIiwidGlwbyI6ImFjY2VzcyIsImV4cCI6MX0.sig";
    (gateway.getTokens as jest.Mock).mockResolvedValue({
      accessToken: expired,
      refreshToken: "r1",
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ accessToken: "a2", refreshToken: "r2" }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await client.request<{ ok: boolean }>("/cobrador/mis-rutas");

    expect(gateway.saveTokens).toHaveBeenCalledWith({
      accessToken: "a2",
      refreshToken: "r2",
    });
    expect(result).toEqual({ ok: true });
    const secondCall = fetchMock.mock.calls[1] as [string, { headers: Record<string, string> }];
    expect(secondCall[1].headers.Authorization).toBe("Bearer a2");
  });

  it("reintenta una vez si el servidor responde 401 y el refresh funciona", async () => {
    (gateway.getTokens as jest.Mock).mockResolvedValue({
      accessToken: vigente(),
      refreshToken: "r1",
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ mensaje: "no" }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: "a2", refreshToken: "r2" }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await client.request<{ ok: boolean }>("/cobrador/mis-rutas");

    expect(gateway.saveTokens).toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });

  it("limpia la sesión y lanza 401 si el refresh falla", async () => {
    (gateway.getTokens as jest.Mock).mockResolvedValue({
      accessToken: vigente(),
      refreshToken: "r1",
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ mensaje: "no" }, 401))
      .mockResolvedValueOnce(jsonResponse({ mensaje: "refresh inválido" }, 401));

    await expect(client.request("/cobrador/mis-rutas")).rejects.toMatchObject({
      status: 401,
    });
    expect(gateway.clear).toHaveBeenCalled();
  });

  it("lanza 401 si no hay sesión guardada", async () => {
    (gateway.getTokens as jest.Mock).mockResolvedValue(null);

    await expect(client.request("/cobrador/mis-rutas")).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("requestBytes", () => {
    it("devuelve el body como bytes en una respuesta ok", async () => {
      (gateway.getTokens as jest.Mock).mockResolvedValue({
        accessToken: vigente(),
        refreshToken: "r1",
      });
      fetchMock.mockResolvedValue(
        new Response(new Uint8Array([37, 80, 68, 70]).buffer as ArrayBuffer, {
          status: 200,
        }),
      );

      const bytes = await client.requestBytes("/cobrador/rutas/6/liquidaciones/1/export-pdf");

      expect(Array.from(bytes)).toEqual([37, 80, 68, 70]);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://localhost:3000/cobrador/rutas/6/liquidaciones/1/export-pdf",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: expect.any(String) }),
        }),
      );
    });

    it("refresca y reintenta ante un 401 del servidor", async () => {
      (gateway.getTokens as jest.Mock).mockResolvedValue({
        accessToken: vigente(),
        refreshToken: "r1",
      });
      (gateway.saveTokens as jest.Mock).mockResolvedValue(undefined);
      fetchMock
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(
          jsonResponse({ accessToken: vigente(), refreshToken: "r2" }),
        )
        .mockResolvedValueOnce(
          new Response(new Uint8Array([1, 2]).buffer as ArrayBuffer, { status: 200 }),
        );

      const bytes = await client.requestBytes("/x");
      expect(Array.from(bytes)).toEqual([1, 2]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    });

    it("lanza ApiError si la respuesta no es ok", async () => {
      (gateway.getTokens as jest.Mock).mockResolvedValue({
        accessToken: vigente(),
        refreshToken: "r1",
      });
      fetchMock.mockResolvedValue(new Response("boom", { status: 500 }));

      await expect(client.requestBytes("/x")).rejects.toMatchObject({ status: 500 });
    });

    it("lanza 401 sin fetch si no hay sesión", async () => {
      (gateway.getTokens as jest.Mock).mockResolvedValue(null);

      await expect(client.requestBytes("/x")).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("limpia la sesión y lanza 401 si el refresh falla", async () => {
      (gateway.getTokens as jest.Mock).mockResolvedValue({
        accessToken: token(Math.floor(Date.now() / 1000) - 60),
        refreshToken: "r1",
      });
      fetchMock.mockResolvedValue(new Response(null, { status: 401 }));

      await expect(client.requestBytes("/x")).rejects.toMatchObject({ status: 401 });
      expect(gateway.clear).toHaveBeenCalled();
    });
  });
});

describe("esErrorDeRed", () => {
  it("devuelve true para un error que no es ApiError (fallo de red)", () => {
    expect(esErrorDeRed(new Error("Network request failed"))).toBe(true);
  });

  it("devuelve false para un ApiError (respuesta HTTP del backend)", () => {
    expect(esErrorDeRed(new ApiError(401, "No autorizado"))).toBe(false);
  });
});
