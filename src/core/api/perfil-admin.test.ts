jest.mock("./multipart", () => ({
  construirMultipart: jest.fn(),
}));

import type { AdminSesion } from "@core/session/types";
import { construirMultipart } from "./multipart";
import {
  apiCambiarPasswordAdmin,
  apiGuardarPerfilAdmin,
  apiLeerPerfilAdmin,
  apiQuitarAvatarAdmin,
  apiSubirAvatarAdmin,
} from "./perfil-admin";

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const multipartMock = construirMultipart as jest.MockedFunction<typeof construirMultipart>;

const SESION: AdminSesion = {
  token: "t-opaco",
  adminId: "a-1",
  email: "dueno@x.com",
  role: "owner",
  tenantId: "t-1",
  tenantName: "Negocio",
  permissions: {},
};

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  multipartMock.mockReset();
});

describe("api del perfil admin", () => {
  it("lee /admin/me con Bearer y X-Tenant-Id", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { email: "dueno@x.com" }));
    await apiLeerPerfilAdmin(SESION);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me");
    expect(init.headers.Authorization).toBe("Bearer t-opaco");
    expect(init.headers["X-Tenant-Id"]).toBe("t-1");
  });

  it("guarda el perfil con PATCH y el cuerpo editable", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { email: "dueno@x.com" }));
    await apiGuardarPerfilAdmin(SESION, {
      nombre: "Dueño",
      telefono: "+5917000111",
      username: "dueno",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      nombre: "Dueño",
      telefono: "+5917000111",
      username: "dueno",
    });
  });

  it("cambia la contraseña con POST y propaga el error del backend", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(400, {
      error: { code: "password_actual", message: "La contraseña actual no es correcta." },
    }));

    await expect(
      apiCambiarPasswordAdmin(SESION, { actual: "mala", nueva: "nueva123" }),
    ).rejects.toMatchObject({
      status: 400,
      code: "password_actual",
      message: "La contraseña actual no es correcta.",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me/password");
    expect(JSON.parse(init.body)).toEqual({ actual: "mala", nueva: "nueva123" });
  });

  it("sube el avatar como multipart con el campo file", async () => {
    multipartMock.mockResolvedValueOnce({ body: new Uint8Array([1, 2]), boundary: "b-1" });
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { email: "dueno@x.com" }));

    await apiSubirAvatarAdmin(SESION, {
      uri: "file:///avatar.jpg",
      name: "avatar.jpg",
      type: "image/jpeg",
    });

    expect(multipartMock).toHaveBeenCalledWith({}, [
      { campo: "file", uri: "file:///avatar.jpg", name: "avatar.jpg", type: "image/jpeg" },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me/avatar");
    expect(init.headers["Content-Type"]).toBe("multipart/form-data; boundary=b-1");
  });

  it("quita el avatar con DELETE", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(204, undefined));
    await apiQuitarAvatarAdmin(SESION);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/v1/admin/me/avatar");
    expect(init.method).toBe("DELETE");
  });
});
