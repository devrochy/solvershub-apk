import { act, renderHook } from "@testing-library/react-native";
import { ApiAuthError } from "@core/api/auth-admin";
import { claveDeSesion, reintentarCampoAprobado, useModoPanel } from "./modo-panel";

describe("useModoPanel (apk#220)", () => {
  const montar = (adminId: string | null, rolDeCampo: string | null) =>
    renderHook((p: { adminId: string | null; rolDeCampo: string | null }) => useModoPanel(p.adminId, p.rolDeCampo), {
      initialProps: { adminId, rolDeCampo },
    });

  it("arranca fuera del panel", async () => {
    const { result } = await montar("u-1", null);
    expect(result.current.enPanel).toBe(false);
  });

  it("un usuario de panel entra al panel", async () => {
    const { result } = await montar("u-1", null);
    await act(async () => result.current.entrarPanel());
    expect(result.current.enPanel).toBe(true);
  });

  it("al cerrar sesión se apaga: el gestor que entra después ve la app de campo", async () => {
    const { result, rerender } = await montar("colaborador", null);
    await act(async () => result.current.entrarPanel());
    expect(result.current.enPanel).toBe(true);

    await rerender({ adminId: null, rolDeCampo: null });
    expect(result.current.enPanel).toBe(false);

    await rerender({ adminId: "gestor", rolDeCampo: null });
    expect(result.current.enPanel).toBe(false);
    await rerender({ adminId: "gestor", rolDeCampo: "gestor" });
    expect(result.current.enPanel).toBe(false);
  });

  it("cambiar de usuario sin pasar por el cierre también lo apaga", async () => {
    const { result, rerender } = await montar("colaborador", null);
    await act(async () => result.current.entrarPanel());
    await rerender({ adminId: "gestor", rolDeCampo: null });
    expect(result.current.enPanel).toBe(false);
  });

  it("una sesión de campo con rol gestor manda sobre un modo panel viejo", async () => {
    const { result, rerender } = await montar("u-1", null);
    await act(async () => result.current.entrarPanel());
    await rerender({ adminId: "u-1", rolDeCampo: "gestor" });
    expect(result.current.enPanel).toBe(false);
  });

  it("una sesión de campo con otro rol abre el panel", async () => {
    const { result } = await montar("u-1", "admin");
    expect(result.current.enPanel).toBe(true);
  });

  it("recordar el panel de un usuario no se pierde al cargar su sesión", async () => {
    const { result, rerender } = await montar(null, null);
    await rerender({ adminId: "u-1", rolDeCampo: null });
    await act(async () => result.current.entrarPanel());
    await rerender({ adminId: "u-1", rolDeCampo: null });
    expect(result.current.enPanel).toBe(true);
  });
});

describe("claveDeSesion (apk#220)", () => {
  // El backend responde el login con `admin_id` y la app lee `adminId`: en sesiones reales
  // `adminId` llega `undefined`, así que la clave no puede depender de él.
  const sesionReal = (token: string) => ({ token, adminId: undefined as unknown as string });

  it("no usa adminId: dos usuarios distintos dan claves distintas", () => {
    expect(claveDeSesion(sesionReal("tok-colaborador"))).not.toBe(claveDeSesion(sesionReal("tok-gestor")));
  });

  it("sin sesión no hay clave", () => {
    expect(claveDeSesion(null)).toBeNull();
  });

  it("apaga el modo panel al entrar otro usuario aunque adminId no venga", async () => {
    const { result, rerender } = await renderHook(
      (p: { sesion: { token: string; adminId: string } | null }) => useModoPanel(claveDeSesion(p.sesion), null),
      { initialProps: { sesion: sesionReal("tok-colaborador") as { token: string; adminId: string } | null } },
    );
    await act(async () => result.current.entrarPanel());
    expect(result.current.enPanel).toBe(true);
    await rerender({ sesion: null });
    await rerender({ sesion: sesionReal("tok-gestor") });
    expect(result.current.enPanel).toBe(false);
  });
});

describe("reintentarCampoAprobado (apk#220)", () => {
  const base = () => ({
    token: "t",
    negocio: "n",
    hayCampo: false,
    pedirCampo: jest.fn().mockResolvedValue({ rol: "gestor" }),
    aplicarCampo: jest.fn().mockResolvedValue(undefined),
    entrarPanel: jest.fn(),
  });

  it("repite el intercambio a campo y lo aplica aunque el modo panel venga de antes", async () => {
    const d = base();
    await reintentarCampoAprobado(d);
    expect(d.pedirCampo).toHaveBeenCalledWith("t", "n");
    expect(d.aplicarCampo).toHaveBeenCalledWith({ rol: "gestor" });
    expect(d.entrarPanel).not.toHaveBeenCalled();
  });

  it("sin acceso de campo manda al panel", async () => {
    const d = base();
    d.pedirCampo.mockRejectedValue(new ApiAuthError(403, "sin_acceso_campo", "sin acceso"));
    await reintentarCampoAprobado(d);
    expect(d.entrarPanel).toHaveBeenCalled();
  });

  it("otro error no cambia nada", async () => {
    const d = base();
    d.pedirCampo.mockRejectedValue(new Error("red"));
    await reintentarCampoAprobado(d);
    expect(d.entrarPanel).not.toHaveBeenCalled();
    expect(d.aplicarCampo).not.toHaveBeenCalled();
  });

  it("con sesión de campo ya aplicada o sin sesión admin no hace nada", async () => {
    const conCampo = { ...base(), hayCampo: true };
    await reintentarCampoAprobado(conCampo);
    const sinToken = { ...base(), token: null };
    await reintentarCampoAprobado(sinToken);
    expect(conCampo.pedirCampo).not.toHaveBeenCalled();
    expect(sinToken.pedirCampo).not.toHaveBeenCalled();
  });
});
