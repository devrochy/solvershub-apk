jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { tenantId: "t1", tenantName: "Panadería La Espiga", role: "owner", permissions: {} } }),
}));
jest.mock("@shared/ui/motion", () => ({ ...jest.requireActual("@shared/ui/motion"), useReduceMotion: () => true }));

import { useEffect } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import type { Recorrido } from "../logica";
import { RecorridoScreen } from "./RecorridoScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: mockPatch, del: jest.fn() };

const nuevo: Recorrido = { estado: "pendiente", paso: 1, total_pasos: 5, aplica: true, abrir: true, avisar: false };
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

function responder(recorrido: Recorrido, opciones: { keyTaken?: boolean } = {}) {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/onboarding") return Promise.resolve({ recorrido });
    if (path === "/admin/settings") return Promise.resolve({ identity: identidad });
    if (path === "/admin/playground") return Promise.resolve({ turns: [] });
    if (path === "/admin/agents/a-1") return Promise.resolve({ id: "a-1", key: "agenda", name: "Tomás" });
    return Promise.reject(new Error(path));
  });
  mockPost.mockImplementation((path: string, body?: { paso?: number }) => {
    if (path === "/admin/onboarding/avanzar")
      return Promise.resolve({
        ...recorrido,
        estado: "en_curso",
        paso: body?.paso ?? 1,
        abrir: false,
        avisar: true,
        agente_id: (body?.paso ?? 1) > 1 ? "a-1" : recorrido.agente_id,
        conexion_id: (body?.paso ?? 1) > 1 ? "c-1" : recorrido.conexion_id,
      });
    if (path === "/admin/onboarding/omitir") return Promise.resolve({ ...recorrido, estado: "omitido", avisar: true });
    if (path === "/admin/agents/from-script") {
      if (opciones.keyTaken) return Promise.reject(new AdminApiError(409, "key_taken", "Ya tienes un agente", { agent_id: "a-1" }));
      return Promise.resolve({ agent: { id: "a-1" }, warnings: [], enabled_skills: [], requirements: [] });
    }
    if (path === "/admin/onboarding/dejar-listo")
      return Promise.resolve({
        conexion_id: "c-1",
        listo: true,
        pasos: [],
        recorrido: { ...recorrido, estado: "en_curso", agente_id: "a-1", conexion_id: "c-1" },
      });
    return Promise.reject(new Error(path));
  });
  mockPut.mockResolvedValue(undefined);
  mockPatch.mockResolvedValue(undefined);
}

function llamadas(): string[] {
  return [...mockPut.mock.calls.map((c) => `PUT ${c[0]}`), ...mockPost.mock.calls.map((c) => `POST ${c[0]}`)];
}

describe("RecorridoScreen (HU-APP-23, 5 estaciones)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
  });

  it("abre «Tu negocio» a pantalla completa con la franja, el logo y la mini ruta de 5", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByText("Cuéntanos de tu negocio"));
    expect(api.getByTestId("onb-escenario")).toBeTruthy();
    expect(api.getByTestId("logo-horizontal")).toBeTruthy();
    expect(api.getByText("Paso 1 de 5 · Tu negocio")).toBeTruthy();
    expect(api.getByTestId("onb-escenario-ruta").props.accessibilityValue).toEqual({ min: 1, max: 5, now: 1 });
    // Se retoma con lo de 5: el servidor guarda la escala.
    expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/avanzar", { paso: 1, pasos: 5 });
  });

  it("llega con lo recomendado: Vendo productos, Laura sugerida y la frase del tipo", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-tipo-ventas"));
    expect(api.getByTestId("onb-tipo-ventas").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("onb-tipo-ventas").props.accessibilityHint).toContain("Recomendado");
    expect(api.getByTestId("onb-nombre").props.value).toBe("Laura");
    expect(api.getByText("Sugerido")).toBeTruthy();
    expect(api.getByTestId("onb-negocio").props.value).toBe("Panadería La Espiga");
    expect(api.getByTestId("onb-descripcion").props.value).toContain("tomamos pedidos");
    expect(api.getByText("Crear a Laura y seguir")).toBeTruthy();
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("cuenta los cambios frente a lo recomendado y «Usar lo recomendado» vuelve a lo de antes", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-tipo-agenda"));
    await fireEvent.press(api.getByTestId("onb-tipo-agenda"));
    expect(api.getByText(/1 cambio/)).toBeTruthy();
    // La frase siguió al tipo: no es un segundo cambio.
    expect(api.getByTestId("onb-descripcion").props.value).toContain("cita previa");
    await fireEvent.press(api.getByTestId("onb-sugerido-Tomás"));
    expect(api.getByText(/2 cambios/)).toBeTruthy();
    await fireEvent.press(api.getByTestId("onb-recomendado-usar"));
    expect(api.getByTestId("onb-tipo-ventas").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("onb-nombre").props.value).toBe("Laura");
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("sin nombre del negocio no avanza ni escribe nada", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-negocio"));
    await fireEvent.changeText(api.getByTestId("onb-negocio"), "");
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    expect(api.getByText("Escribe cómo se llama tu negocio.")).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("al salir de la estación 1 guarda la identidad, crea el agente, lo deja listo y sigue en Habilidades", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-siguiente"));
    mockPost.mockClear();
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => api.getByText("Paso 2 de 5 · Habilidades"));
    expect(llamadas()).toEqual([
      "PUT /admin/settings/identity",
      "POST /admin/agents/from-script",
      "POST /admin/onboarding/dejar-listo",
      "POST /admin/onboarding/avanzar",
    ]);
    expect(mockPut.mock.calls[0][1]).toMatchObject({
      assistant_name: "Laura",
      business_description: expect.stringMatching(/^Panadería La Espiga\. Vendemos/),
      business_tz: "America/Bogota",
    });
    expect(mockPost).toHaveBeenCalledWith("/admin/agents/from-script", {
      template_key: "ventas",
      answers: { largo_respuesta: "normal" },
      name: "Laura",
    });
    expect(mockPost).toHaveBeenLastCalledWith("/admin/onboarding/avanzar", { paso: 2, pasos: 5 });
    expect(api.getByText("¿Qué sabe hacer Laura?")).toBeTruthy();
  });

  it("si el tipo ya existe (reintento tras un corte) sigue con ese agente en vez de duplicarlo", async () => {
    responder(nuevo, { keyTaken: true });
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-siguiente"));
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => api.getByText("Paso 2 de 5 · Habilidades"));
    expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/dejar-listo", { agent_id: "a-1" });
  });

  it("retoma con el agente creado en su estación, con su tipo fijo y sin crear otro", async () => {
    responder({ ...nuevo, estado: "en_curso", paso: 3, agente_id: "a-1", conexion_id: "c-1" });
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByText("Paso 3 de 5 · Datos del cliente"));
    expect(api.getByText("¿Qué datos pide Tomás?")).toBeTruthy();
    expect(mockPost).not.toHaveBeenCalledWith("/admin/agents/from-script", expect.anything());
    // Vuelve a «Tu negocio»: el tipo del agente no cambia y el botón guarda en vez de crear.
    await fireEvent.press(api.getByTestId("onb-atras"));
    await fireEvent.press(api.getByTestId("onb-atras"));
    await waitFor(() => api.getByText("Guardar y seguir"));
    expect(api.getByTestId("onb-tipo-ventas").props.accessibilityState.disabled).toBe(true);
    expect(api.getByTestId("onb-tipo-agenda").props.accessibilityState.selected).toBe(true);
  });

  it("las estaciones 2 a 4 vienen del módulo de agentes: si su guardado falla, no avanza", async () => {
    responder({ ...nuevo, estado: "en_curso", paso: 2, agente_id: "a-1", conexion_id: "c-1" });
    const guardar = jest.fn().mockResolvedValue(false);
    function Estacion({ estacion, registrarGuardar }: PropsDeEstacionDelAgente) {
      useEffect(() => {
        registrarGuardar(guardar);
        return () => registrarGuardar(null);
      }, [registrarGuardar]);
      return <Text>Estación {estacion}</Text>;
    }
    const api = await render(<RecorridoScreen estacionDelAgente={Estacion} />);
    await waitFor(() => api.getByText("Estación habilidades"));
    expect(api.getByText("Guardar y seguir: Datos del cliente")).toBeTruthy();
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => expect(guardar).toHaveBeenCalled());
    expect(api.getByText("Paso 2 de 5 · Habilidades")).toBeTruthy();
    guardar.mockResolvedValue(true);
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => api.getByText("Estación datos-cliente"));
    expect(mockPost).toHaveBeenLastCalledWith("/admin/onboarding/avanzar", { paso: 3, pasos: 5 });
  });

  it("antes de «Revisar y publicar» deja listo con lo último, y la prueba va por la conexión", async () => {
    responder({ ...nuevo, estado: "en_curso", paso: 4, agente_id: "a-1", conexion_id: "c-1" });
    const api = await render(<RecorridoScreen estacionDelAgente={() => null} />);
    await waitFor(() => api.getByText("Paso 4 de 5 · Datos para probar"));
    expect(api.getByText("¿Qué citas agenda Tomás?")).toBeTruthy();
    await fireEvent.press(api.getByTestId("onb-siguiente"));
    await waitFor(() => api.getByText("Paso 5 de 5 · Revisar y publicar"));
    expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/dejar-listo", { agent_id: "a-1" });
    expect(mockGet).toHaveBeenCalledWith("/admin/playground", { connection_id: "c-1" });
    expect(api.getByTestId("onb-resumen")).toBeTruthy();
    expect(api.getByText("Publicar a Tomás")).toBeTruthy();
    // Android no acepta el rol «status» (cerraba la app al entrar aquí): el aviso se anuncia como región viva.
    const falta = api.getByTestId("onb-falta-prueba");
    expect(falta.props.accessibilityRole).toBeUndefined();
    expect(falta.props.accessibilityLiveRegion).toBe("polite");
  });

  it("un aviso de la estación se trae a la vista: desplaza el scroll hasta él, sumando dónde va la estación", async () => {
    responder({ ...nuevo, estado: "en_curso", paso: 3, agente_id: "a-1", conexion_id: "c-1" });
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: () => void }, "scrollTo");
    function Estacion({ mostrarAviso }: PropsDeEstacionDelAgente) {
      return <Pressable testID="estacion-falla" onPress={() => mostrarAviso?.(200)} />;
    }
    const api = await render(<RecorridoScreen estacionDelAgente={Estacion} />);
    await waitFor(() => api.getByTestId("estacion-falla"));
    await fireEvent(api.getByTestId("onb-estacion"), "layout", { nativeEvent: { layout: { x: 0, y: 300, width: 360, height: 900 } } });
    scrollTo.mockClear();
    await fireEvent.press(api.getByTestId("estacion-falla"));
    expect(scrollTo).toHaveBeenCalledWith({ y: 484, animated: true });
    scrollTo.mockRestore();
  });

  it("«Seguir después» confirma qué pasa y omite", async () => {
    responder(nuevo);
    const { Alert } = jest.requireActual<typeof import("react-native")>("react-native");
    const alerta = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Seguir después")?.onPress?.();
    });
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("onb-omitir"));
    await fireEvent.press(api.getByTestId("onb-omitir"));
    expect(alerta.mock.calls[0][0]).toBe("Laura no atiende hasta que termines.");
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/admin/onboarding/omitir"));
    alerta.mockRestore();
  });

  it("el chat de las estaciones 1 a 4 es simulado: responde sin red", async () => {
    responder(nuevo);
    const api = await render(<RecorridoScreen />);
    await waitFor(() => api.getByTestId("vista-previa-quien"));
    const antes = mockPost.mock.calls.length + mockGet.mock.calls.length;
    await fireEvent.press(api.getByTestId("vista-previa-quien"));
    expect(api.getByText("Soy Laura, de Panadería La Espiga. Te ayudo con pedidos, precios y domicilios.")).toBeTruthy();
    expect(mockPost.mock.calls.length + mockGet.mock.calls.length).toBe(antes);
  });
});
