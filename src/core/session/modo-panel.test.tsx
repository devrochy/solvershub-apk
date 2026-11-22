import { act, renderHook } from "@testing-library/react-native";
import { ApiAuthError } from "@core/api/auth-admin";
import { claveDeSesion, decidirModo, resolverModo, useModoPanel, type ResolucionDeModo } from "./modo-panel";

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
  // Las sesiones guardadas antes de leer `admin_id` no traen `adminId`: la clave no depende de él.
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

describe("decidirModo: una sola regla panel/campo (apk#270)", () => {
  it.each([
    ["sesión de campo de gestor", { campo: { rol: "gestor" } }, "campo"],
    ["sesión de campo sin rol (contrato viejo = gestor)", { campo: {} }, "campo"],
    ["sesión de campo de propietario", { campo: { rol: "propietario" } }, "panel"],
    ["sin acceso de campo", { error: new ApiAuthError(403, "sin_acceso_campo", "x") }, "panel"],
    ["equipo pendiente", { error: new ApiAuthError(403, "dispositivo_pendiente", "x") }, "espera"],
    ["equipo bloqueado", { error: new ApiAuthError(403, "dispositivo_bloqueado", "x") }, "espera"],
    ["otro 403", { error: new ApiAuthError(403, "otro", "x") }, "sin_respuesta"],
    ["sin red", { error: new Error("red") }, "sin_respuesta"],
  ] as const)("%s → %s", (_n, entrada, esperado) => {
    expect(decidirModo(entrada as Parameters<typeof decidirModo>[0])).toBe(esperado);
  });
});

/**
 * Simula la raíz de la app: el modo visible se calcula como en `App.tsx` (`useModoPanel`, con el
 * rol de la sesión de campo aplicada), para comparar caminos por lo que el usuario ve.
 */
function raiz(inicial: { forzado: boolean; rol: string | null }) {
  const estado = { ...inicial };
  const d = (pedirCampo: ResolucionDeModo["pedirCampo"], extra: Partial<ResolucionDeModo> = {}): ResolucionDeModo => ({
    token: "t",
    negocio: "n",
    hayCampo: estado.rol !== null,
    pedirCampo,
    aplicarCampo: jest.fn(async (campo: { rol?: string | null }) => {
      estado.rol = campo.rol ?? "gestor";
    }),
    descartarCampo: jest.fn(async () => {
      estado.rol = null;
    }),
    entrarPanel: () => {
      estado.forzado = true;
    },
    salirDelPanel: () => {
      estado.forzado = false;
    },
    ...extra,
  });
  const visible = () => {
    const deCampoDePanel = estado.rol !== null && estado.rol !== "gestor";
    if (deCampoDePanel || (estado.forzado && estado.rol !== "gestor")) return "panel";
    return estado.rol === "gestor" ? "campo" : "login";
  };
  return { estado, d, visible };
}

describe("resolverModo (apk#270)", () => {
  const gestor = () => jest.fn().mockResolvedValue({ rol: "gestor" });
  const sinAcceso = () => jest.fn().mockRejectedValue(new ApiAuthError(403, "sin_acceso_campo", "x"));

  it("aprobado tras la espera con un panel puesto por la hidratación: entra a campo", async () => {
    const r = raiz({ forzado: true, rol: null });
    await resolverModo(r.d(gestor()));
    expect(r.visible()).toBe("campo");
    expect(r.estado.forzado).toBe(false);
  });

  it("pregunta aunque ya haya sesión de campo guardada (no se salta la decisión)", async () => {
    const r = raiz({ forzado: false, rol: "gestor" });
    const pedir = sinAcceso();
    await resolverModo(r.d(pedir));
    expect(pedir).toHaveBeenCalledWith("t", "n");
    expect(r.visible()).toBe("panel");
    expect(r.estado.rol).toBeNull();
  });

  it("arranque en frío con campo guardado y sin red: sigue en campo", async () => {
    const r = raiz({ forzado: false, rol: "gestor" });
    await resolverModo(r.d(jest.fn().mockRejectedValue(new Error("red")), { respaldoInmediato: true }));
    expect(r.visible()).toBe("campo");
  });

  it("arranque en frío de una sesión admin sola: panel ya, campo si el backend lo emite", async () => {
    const r = raiz({ forzado: false, rol: null });
    let responder: (v: { rol: string }) => void = () => undefined;
    const pedir = jest.fn(() => new Promise<{ rol: string }>((ok) => (responder = ok)));
    const enCurso = resolverModo(r.d(pedir, { respaldoInmediato: true }));
    expect(r.visible()).toBe("panel");
    responder({ rol: "gestor" });
    await enCurso;
    expect(r.visible()).toBe("campo");
  });

  it("sin red y sin campo guardado: panel (el mismo respaldo en los dos caminos)", async () => {
    const r = raiz({ forzado: false, rol: null });
    await resolverModo(r.d(jest.fn().mockRejectedValue(new Error("red"))));
    expect(r.visible()).toBe("panel");
  });

  it("equipo todavía pendiente: no cambia el modo (la raíz muestra la espera)", async () => {
    const r = raiz({ forzado: false, rol: null });
    const modo = await resolverModo(r.d(jest.fn().mockRejectedValue(new ApiAuthError(403, "dispositivo_pendiente", "x"))));
    expect(modo).toBe("espera");
    expect(r.visible()).toBe("login");
  });

  it("la sesión cambió mientras preguntaba: no aplica nada", async () => {
    const r = raiz({ forzado: false, rol: null });
    await resolverModo(r.d(gestor(), { vigente: () => false }));
    expect(r.visible()).toBe("login");
  });

  it("sin negocio en la sesión admin: aplica el respaldo sin preguntar", async () => {
    const r = raiz({ forzado: false, rol: null });
    const pedir = gestor();
    await resolverModo(r.d(pedir, { negocio: null }));
    expect(pedir).not.toHaveBeenCalled();
    expect(r.visible()).toBe("panel");
  });

  // La prueba del issue: para la misma respuesta del backend, la espera aprobada y el arranque en
  // frío (con lo que la espera dejó guardado) muestran el mismo modo.
  it.each([
    ["el backend emite campo de gestor", () => gestor()],
    ["el backend responde sin acceso de campo", () => sinAcceso()],
    ["el backend emite campo de propietario", () => jest.fn().mockResolvedValue({ rol: "propietario" })],
  ])("misma cuenta, mismo modo al aprobar y al reabrir: %s", async (_n, backend) => {
    const espera = raiz({ forzado: true, rol: null });
    await resolverModo(espera.d(backend()));
    const alAprobar = espera.visible();

    // Reabrir: la sesión de campo guardada sobrevive, el modo panel no (es memoria).
    const frio = raiz({ forzado: false, rol: espera.estado.rol });
    await resolverModo(frio.d(backend(), { respaldoInmediato: true }));
    expect(frio.visible()).toBe(alAprobar);
  });
});
