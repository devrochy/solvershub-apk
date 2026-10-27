jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { tenantId: "t1", tenantName: "Moda Sur", role: "admin", permissions: {} } }),
}));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import type { Recorrido } from "../logica";
import { RecorridoScreen } from "./RecorridoScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

const nuevo: Recorrido = { estado: "pendiente", paso: 1, total_pasos: 6, aplica: true, abrir: true, avisar: false };
const identidad = {
  assistant_name: "Asistente",
  business_description: "",
  persona_tone: "cercano",
  persona_warmth: 4,
  persona_emojis: "sparse",
  persona_max_length: 500,
  persona_forbidden: [],
  escalation_keywords: [],
  business_ranges: [],
  timezone: "America/Bogota",
  bot_paused: false,
  out_of_hours_default_message: "x",
  tono: "x",
};

function responder(recorrido: Recorrido) {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/onboarding") return Promise.resolve({ recorrido });
    if (path === "/admin/settings") return Promise.resolve({ identity: identidad });
    if (path === "/admin/playground") return Promise.resolve({ turns: [] });
    return Promise.reject(new Error(path));
  });
  mockPost.mockImplementation((path: string, body?: { paso?: number }) => {
    if (path === "/admin/onboarding/avanzar")
      return Promise.resolve({ ...recorrido, estado: "en_curso", paso: body?.paso ?? 1, abrir: false, avisar: true });
    if (path === "/admin/onboarding/omitir") return Promise.resolve({ ...recorrido, estado: "omitido", avisar: true });
    return Promise.reject(new Error(path));
  });
  mockPut.mockResolvedValue(undefined);
}

describe("RecorridoScreen (HU-APP-22)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
  });

  it("muestra el paso 1 con el logo y no avanza sin lo necesario", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByText("Cuéntanos de tu negocio"));
    expect(api.getByTestId("logo-horizontal")).toBeTruthy();
    expect(api.getByText("Paso 1 de 6")).toBeTruthy();
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    expect(api.getByText("Elige a qué se dedica tu negocio.")).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("guarda el paso en Identidad (completa, sin lo de solo lectura) y pasa al siguiente", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-tipo-ventas"));
    await fireEvent.press(api.getByTestId("onb-tipo-ventas"));
    await fireEvent.changeText(api.getByTestId("onb-descripcion"), "Vendemos ropa deportiva en Manizales");
    await fireEvent.press(api.getByTestId("onb-sugerido-Sofía"));
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => api.getByText("¿Cómo quieres que hable?"));
    const [ruta, cuerpo] = mockPut.mock.calls[0];
    expect(ruta).toBe("/admin/settings/identity");
    expect(cuerpo).toMatchObject({ assistant_name: "Sofía", persona_tone: "cercano", business_tz: "America/Bogota" });
    expect(cuerpo).not.toHaveProperty("out_of_hours_default_message");
    expect(cuerpo).not.toHaveProperty("bot_paused");
    expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/avanzar", { paso: 2 });
    expect(api.getByText("Paso 2 de 6")).toBeTruthy();
  });

  it("«Lo hago después» pide confirmación y deja el recorrido omitido", async () => {
    responder(nuevo);
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-omitir"));
    await fireEvent.press(api.getByTestId("onb-omitir"));
    const botones = alerta.mock.calls[0][2] ?? [];
    expect(botones.map((b) => b.text)).toEqual(["Seguir ahora", "Lo hago después"]);
    botones[1].onPress?.();
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/omitir"));
    alerta.mockRestore();
  });

  it("retoma en el paso 5 con el agente ya creado y lo deja listo sin crear otro", async () => {
    const retomado: Recorrido = { ...nuevo, estado: "en_curso", paso: 5, abrir: false, agente_id: "a1" };
    responder(retomado);
    mockPost.mockImplementation((path: string, body?: { paso?: number }) => {
      if (path === "/admin/onboarding/dejar-listo")
        return Promise.resolve({
          conexion_id: "c1",
          release_id: "r1",
          listo: true,
          pasos: [
            { clave: "conexion", estado: "hecho" },
            { clave: "publicar", estado: "hecho" },
            { clave: "activar", estado: "hecho" },
          ],
          recorrido: { ...retomado, conexion_id: "c1" },
        });
      return Promise.resolve({ ...retomado, paso: body?.paso ?? 5 });
    });
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByText("Crea tu agente"));
    await fireEvent.press(api.getByTestId("onb-crear"));
    await waitFor(() => api.getByText("Probar mi agente"));
    expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/dejar-listo", { agent_id: "a1" });
    expect(mockPost).not.toHaveBeenCalledWith("/admin/agents/from-script", expect.anything());
    expect(api.getByText("Todo listo. Sigue para probar a tu agente.")).toBeTruthy();
  });

  it("si ya hay un chat web en vivo lo dice y permite reintentar", async () => {
    const retomado: Recorrido = { ...nuevo, estado: "en_curso", paso: 5, abrir: false, agente_id: "a1" };
    responder(retomado);
    mockPost.mockImplementation((path: string) =>
      path === "/admin/onboarding/dejar-listo"
        ? Promise.reject(new AdminApiError(409, "canal_en_vivo", "Hay un chat web en vivo."))
        : Promise.resolve(retomado),
    );
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-crear"));
    await fireEvent.press(api.getByTestId("onb-crear"));
    await waitFor(() => api.getByText(/Ya tienes un chat web en vivo/));
    expect(api.getByText("Reintentar")).toBeTruthy();
  });

  it("en el chat de prueba lo escrito va junto a su respuesta aunque ya hubiera historial", async () => {
    const enPrueba: Recorrido = { ...nuevo, estado: "en_curso", paso: 6, abrir: false, agente_id: "a1", conexion_id: "c1" };
    responder(enPrueba);
    let turnos = [{ text: "Respuesta vieja", escalated: false }];
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/onboarding") return Promise.resolve({ recorrido: enPrueba });
      if (path === "/admin/settings") return Promise.resolve({ identity: identidad });
      if (path === "/admin/playground") return Promise.resolve({ turns: turnos });
      return Promise.reject(new Error(path));
    });
    mockPost.mockImplementation((path: string) => {
      if (path === "/admin/playground/message") {
        turnos = [...turnos, { text: "Respuesta nueva", escalated: false }];
        return Promise.resolve({});
      }
      return Promise.resolve(enPrueba);
    });
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByText("Respuesta vieja"));
    await fireEvent.changeText(api.getByTestId("onb-prueba-texto"), "hola");
    await fireEvent.press(api.getByTestId("onb-prueba-enviar"));
    await waitFor(() => api.getByText("Respuesta nueva"));
    const arbol = JSON.stringify(api.toJSON());
    expect(mockPost).toHaveBeenCalledWith("/admin/playground/message", { text: "hola", connection_id: "c1" });
    // «hola» va después de la respuesta vieja y justo antes de la nueva.
    expect(arbol.indexOf("Respuesta vieja")).toBeLessThan(arbol.indexOf('"hola"'));
    expect(arbol.indexOf('"hola"')).toBeLessThan(arbol.indexOf("Respuesta nueva"));
    // Una respuesta del agente habilita Terminar.
    expect(api.getByTestId("onb-terminar")).toBeTruthy();
  });
});
