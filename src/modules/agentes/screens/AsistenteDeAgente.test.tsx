jest.mock("@core/secure-kv", () => ({ secureGet: jest.fn(), secureSet: jest.fn() }));
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { token: "t", tenantId: "n-1", tenantName: "Panadería La Espiga" } }),
}));
jest.mock("@shared/ui/motion", () => ({ ...jest.requireActual("@shared/ui/motion"), useReduceMotion: () => true }));

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { secureGet, secureSet } from "@core/secure-kv";
import { useAdminApi } from "@core/session/use-admin-api";
import type { AgenteDelNegocio } from "../asistente";
import { AsistenteDeAgente } from "./AsistenteDeAgente";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: mockPatch, del: jest.fn() };

const guion = [
  {
    id: "largo_respuesta",
    text: "¿Cómo responde?",
    help: "",
    type: "option",
    default: "normal",
    options: [
      { id: "cortas", text: "Cortas", help: "" },
      { id: "normal", text: "Normales", help: "Lo habitual." },
    ],
  },
];
const plantilla = (key: string, name: string, extra: Record<string, unknown> = {}) => ({
  key,
  name,
  description: `Agente de ${name}`,
  available: true,
  missing_skills: [],
  will_enable: [],
  superpowers: [],
  requirements: [],
  questions: guion,
  ...extra,
});
const PLANTILLAS = [
  plantilla("ventas", "Ventas"),
  plantilla("agenda", "Agenda"),
  plantilla("cobranza", "Cobranza"),
  plantilla("suscripciones", "Suscripciones", { available: false }),
];
const DATOS_DE_LA_CITA = {
  agente_id: "a-1",
  niveles: ["requerido", "recomendado", "no_pedir"],
  herramientas_del_agente: false,
  procedimientos: [],
  acciones: [
    {
      id: "agenda.agendar_cita",
      modulo: "agenda",
      etiqueta: "Agendar una cita",
      campos: [
        { clave: "nombre", etiqueta: "Nombre", nivel: "requerido", por_defecto: "requerido", ajustable: true, ajustado: false },
        { clave: "invitados", etiqueta: "Invitados", nivel: "no_pedir", por_defecto: "no_pedir", ajustable: true, ajustado: false },
      ],
    },
  ],
};
const laura: AgenteDelNegocio = { id: "a-9", key: "ventas", name: "Laura", status: "active", virtual: false };

function responder(opciones: { borrador?: { key: string; name: string; latest_version: number | null } } = {}) {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/agent-templates") return Promise.resolve({ items: PLANTILLAS });
    if (path === "/admin/agents/a-1" && opciones.borrador)
      return Promise.resolve({ id: "a-1", status: "active", ...opciones.borrador });
    if (path === "/admin/agents/a-1/publish-targets")
      return Promise.resolve({
        items: [
          { connection_id: "c1", label: "WhatsApp", channel: "whatsapp", covers_skills: true, installed: false },
          { connection_id: "c2", label: "Chat web", channel: "webchat", covers_skills: true, installed: false },
        ],
      });
    if (path === "/admin/playground") return Promise.resolve({ turns: [] });
    if (path === "/admin/agents/a-1/datos-cliente") return Promise.resolve(DATOS_DE_LA_CITA);
    // Fuera de test no hay carga para Agenda (404): la estación 4 ofrece «Seguir sin datos».
    return Promise.reject(new AdminApiError(404, "not_found", path));
  });
  mockPost.mockImplementation((path: string) => {
    if (path === "/admin/agents/from-script")
      return Promise.resolve({ agent: { id: "a-1" }, warnings: [], enabled_skills: [], requirements: [] });
    if (path === "/admin/agents/a-1/publish")
      return Promise.resolve({
        created: true,
        version: { version: 1 },
        connections: [{ connection_id: "c1", release_id: "r1", error: null, instance: "i", release_created: true, release_number: 1 }],
      });
    return Promise.resolve(undefined);
  });
  mockPatch.mockResolvedValue(undefined);
}

describe("AsistenteDeAgente en 5 estaciones (HU-APP-23)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    (secureGet as jest.Mock).mockResolvedValue(null);
    (secureSet as jest.Mock).mockResolvedValue(undefined);
  });

  it("abre a pantalla completa con ✕ y «Nuevo agente · 1 de 5», con lo recomendado preelegido", async () => {
    responder();
    const onTerminar = jest.fn();
    const api = await render(<AsistenteDeAgente agentes={[laura]} onTerminar={onTerminar} />);
    await waitFor(() => api.getByText("Nuevo agente · 1 de 5"));
    expect(api.getByText("Paso 1 de 5 · Tipo")).toBeTruthy();
    // Ventas está ocupado: lo recomendado es el primer tipo libre, Agenda, con Tomás.
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityHint).toContain("Recomendado");
    expect(api.getByTestId("asistente-nombre").props.value).toBe("Tomás");
    expect(api.getByTestId("asistente-largo_respuesta-normal").props.accessibilityState.selected).toBe(true);
    expect(api.getByText("Crear a Tomás y seguir")).toBeTruthy();
    await fireEvent.press(api.getByLabelText("Cerrar"));
    expect(onTerminar).toHaveBeenCalled();
  });

  it("el tipo ocupado queda deshabilitado con su texto y lleva a la ficha del agente", async () => {
    responder();
    const onAbrirAgente = jest.fn();
    const api = await render(<AsistenteDeAgente agentes={[laura]} onTerminar={jest.fn()} onAbrirAgente={onAbrirAgente} />);
    await waitFor(() => api.getByTestId("asistente-tipo-ventas"));
    expect(api.getByTestId("asistente-tipo-ventas").props.accessibilityState.disabled).toBe(true);
    expect(api.getByText("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.")).toBeTruthy();
    expect(api.getByText("No está en tu servicio por ahora. Pídelo a SolversHub.")).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-tipo-ventas-editar"));
    expect(onAbrirAgente).toHaveBeenCalledWith("a-9");
  });

  it("si el agente del tipo está archivado ofrece «Desarchívalo», lo reactiva y abre su ficha", async () => {
    responder();
    const alerta = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Desarchivar")?.onPress?.();
    });
    const onAbrirAgente = jest.fn();
    const api = await render(
      <AsistenteDeAgente agentes={[{ ...laura, status: "archived" }]} onTerminar={jest.fn()} onAbrirAgente={onAbrirAgente} />,
    );
    await waitFor(() => api.getByTestId("asistente-tipo-ventas-desarchivar"));
    expect(api.getByText("Ya tienes un agente «Ventas», pero está archivado.")).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-tipo-ventas-desarchivar"));
    await waitFor(() => expect(onAbrirAgente).toHaveBeenCalledWith("a-9"));
    expect(mockPatch).toHaveBeenCalledWith("/admin/agents/a-9", { status: "active" });
    alerta.mockRestore();
  });

  it("cambiar una opción muestra los cambios y «Usar lo recomendado» vuelve a lo recomendado", async () => {
    responder();
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-tipo-ventas"));
    expect(api.getByTestId("asistente-nombre").props.value).toBe("Laura");
    await fireEvent.press(api.getByTestId("asistente-largo_respuesta-cortas"));
    expect(api.getByText(/1 cambio/)).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-recomendado-usar"));
    expect(api.getByTestId("asistente-largo_respuesta-normal").props.accessibilityState.selected).toBe(true);
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("al salir de «Tipo» crea el borrador una vez, lo recuerda por su id y sigue en Habilidades", async () => {
    responder();
    const api = await render(<AsistenteDeAgente agentes={[laura]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-siguiente"));
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByText("Nuevo agente · 2 de 5"));
    expect(mockPost).toHaveBeenCalledWith("/admin/agents/from-script", {
      template_key: "agenda",
      answers: { largo_respuesta: "normal" },
      name: "Tomás",
    });
    expect(secureSet).toHaveBeenCalledWith("sh-nuevo-agente:n-1", JSON.stringify({ agentId: "a-1", estacion: 2 }));
    expect(api.getByText("¿Qué sabe hacer Tomás?")).toBeTruthy();
    // Volver a «Tipo» y seguir no crea otro: guarda el nombre si cambió.
    await fireEvent.press(api.getByTestId("asistente-atras"));
    await fireEvent.changeText(api.getByTestId("asistente-nombre"), "Tomasa");
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByText("Nuevo agente · 2 de 5"));
    expect(mockPost.mock.calls.filter((c) => c[0] === "/admin/agents/from-script")).toHaveLength(1);
    expect(mockPatch).toHaveBeenCalledWith("/admin/agents/a-1", { name: "Tomasa" });
  });

  it("si cierra y vuelve, retoma el borrador por su agent_id sin duplicarlo", async () => {
    responder({ borrador: { key: "agenda", name: "Tomás", latest_version: null } });
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(
      <AsistenteDeAgente agentes={[laura, { id: "a-1", key: "agenda", name: "Tomás", status: "active", virtual: false }]} onTerminar={jest.fn()} />,
    );
    await waitFor(() => api.getByText("Nuevo agente · 3 de 5"));
    expect(api.getByText("¿Qué datos pide Tomás?")).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-atras"));
    await fireEvent.press(api.getByTestId("asistente-atras"));
    // Su propio tipo no aparece como ocupado y los demás quedan fijos.
    await waitFor(() => api.getByText("Guardar y seguir"));
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityState.disabled).toBe(false);
    expect(api.getByTestId("asistente-tipo-cobranza").props.accessibilityState.disabled).toBe(true);
    expect(mockPost).not.toHaveBeenCalledWith("/admin/agents/from-script", expect.anything());
  });

  it("Datos del cliente: un cambio se guarda con un PUT al seguir y pasa a la 4", async () => {
    responder({ borrador: { key: "agenda", name: "Tomás", latest_version: null } });
    mockPut.mockResolvedValue({});
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("datos-cliente"));
    await fireEvent.press(api.getByTestId("datos-cliente-accion-agenda.agendar_cita-abrir"));
    await fireEvent.press(api.getByTestId("datos-cliente-agenda.agendar_cita-invitados-requerido"));
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByText("Nuevo agente · 4 de 5"));
    expect(mockPut).toHaveBeenCalledWith("/admin/agents/a-1/datos-cliente", {
      politica: { "agenda.agendar_cita": { invitados: "requerido" } },
      herramientas_del_agente: false,
      metodos_entrega: ["domicilio", "recoger_en_tienda"],
    });
  });

  it("Datos del cliente: si el guardado falla, se queda en la 3 con el error y «Reintentar» sigue al salir bien", async () => {
    responder({ borrador: { key: "agenda", name: "Tomás", latest_version: null } });
    mockPut.mockRejectedValueOnce(new TypeError("Network request failed")).mockResolvedValue({});
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("datos-cliente"));
    await fireEvent.press(api.getByTestId("datos-cliente-historial"));
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByTestId("datos-cliente-error"));
    expect(api.getByText("Nuevo agente · 3 de 5")).toBeTruthy();
    await fireEvent.press(api.getByTestId("datos-cliente-reintentar"));
    await waitFor(() => api.getByText("Nuevo agente · 4 de 5"));
    expect(mockPut).toHaveBeenCalledTimes(2);
  });

  it("un borrador ya publicado no se retoma: se empieza de nuevo", async () => {
    responder({ borrador: { key: "agenda", name: "Tomás", latest_version: 1 } });
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByText("Nuevo agente · 1 de 5"));
    expect(secureSet).toHaveBeenCalledWith("sh-nuevo-agente:n-1", "");
  });

  it("fuera de test, Datos para probar ofrece «Seguir sin datos»; la 5 prueba el borrador y publica donde atiende", async () => {
    responder({ borrador: { key: "agenda", name: "Tomás", latest_version: null } });
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 4 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByText("Por ahora no hay datos que cargar para este tipo"));
    await fireEvent.press(api.getByText("Seguir sin datos"));
    await waitFor(() => api.getByText("Nuevo agente · 5 de 5"));
    expect(api.getByText("Revisa y publica a Tomás")).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith("/admin/playground", { agent_id: "a-1" });
    // «Dónde atiende» llega con lo recomendado: la primera conexión que sirve.
    await waitFor(() => api.getByTestId("asistente-conexion-c1"));
    expect(api.getByTestId("asistente-conexion-c1").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("asistente-conexion-c2").props.accessibilityState.selected).toBe(false);
    await fireEvent.changeText(api.getByTestId("asistente-notas"), "Primera versión");
    await fireEvent.press(api.getByTestId("asistente-publicar"));
    await waitFor(() => api.getByTestId("asistente-publicado"));
    expect(mockPost).toHaveBeenCalledWith("/admin/agents/a-1/publish", { connection_ids: ["c1"], notes: "Primera versión" });
    expect(mockPost).toHaveBeenCalledWith("/admin/connections/c1/releases/r1/promote");
    expect(api.getByText("Tomás quedó publicado y ya atiende.")).toBeTruthy();
    expect(secureSet).toHaveBeenLastCalledWith("sh-nuevo-agente:n-1", "");
  });

  it("con el borrador creado, «Usar lo recomendado» no le cambia el tipo y su guion queda fijo", async () => {
    responder();
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-tipo-agenda"));
    // Elige Agenda en vez de Ventas (lo recomendado) y crea el borrador.
    await fireEvent.press(api.getByTestId("asistente-tipo-agenda"));
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByText("Nuevo agente · 2 de 5"));
    await fireEvent.press(api.getByTestId("asistente-atras"));
    await waitFor(() => api.getByText("Guardar y seguir"));
    // Lo recomendado ahora es su propio tipo: no hay cambios que deshacer ni otro tipo al que saltar.
    expect(api.queryByText("Usar lo recomendado")).toBeNull();
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityHint).toContain("Recomendado");
    expect(api.getByTestId("asistente-largo_respuesta-cortas").props.accessibilityState.disabled).toBe(true);
    expect(api.getByTestId("asistente-guion-fijo")).toBeTruthy();
    // Cambiar el nombre sí cuenta, y volver a lo recomendado deja el tipo del borrador.
    await fireEvent.changeText(api.getByTestId("asistente-nombre"), "Tomasa");
    await fireEvent.press(api.getByTestId("asistente-recomendado-usar"));
    expect(api.getByTestId("asistente-tipo-agenda").props.accessibilityState.selected).toBe(true);
    expect(api.getByTestId("asistente-nombre").props.value).toBe("Tomás");
  });

  it("un tipo que se ocupó mientras tanto no intenta crearse: avisa sin llamar a from-script", async () => {
    responder();
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-nombre"));
    await fireEvent.changeText(api.getByTestId("asistente-nombre"), "Sofía");
    // La lista de agentes llega después con un Ventas activo: la elección del dueño queda en Ventas.
    await api.rerender(<AsistenteDeAgente agentes={[laura]} onTerminar={jest.fn()} />);
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByTestId("asistente-existente"));
    expect(api.getAllByText("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.").length).toBeGreaterThan(0);
    expect(mockPost).not.toHaveBeenCalledWith("/admin/agents/from-script", expect.anything());
  });

  it("un corte de red al retomar no olvida el borrador (no se duplica al volver)", async () => {
    responder();
    const normal = mockGet.getMockImplementation()!;
    mockGet.mockImplementation((path: string, ...resto: unknown[]) =>
      path === "/admin/agents/a-1" ? Promise.reject(new TypeError("Network request failed")) : normal(path, ...resto),
    );
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByText("Nuevo agente · 1 de 5"));
    expect(secureSet).not.toHaveBeenCalledWith("sh-nuevo-agente:n-1", "");
  });

  it("un borrador que ya no existe (404) se olvida", async () => {
    responder();
    (secureGet as jest.Mock).mockResolvedValue(JSON.stringify({ agentId: "a-1", estacion: 3 }));
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByText("Nuevo agente · 1 de 5"));
    await waitFor(() => expect(secureSet).toHaveBeenCalledWith("sh-nuevo-agente:n-1", ""));
  });

  it("si otro creó el tipo mientras tanto (409 key_taken), avisa con el agente que lo ocupa", async () => {
    responder();
    mockPost.mockRejectedValueOnce(new AdminApiError(409, "key_taken", "Ya existe", { agent_id: "a-9" }));
    const onAbrirAgente = jest.fn();
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} onAbrirAgente={onAbrirAgente} />);
    await waitFor(() => api.getByTestId("asistente-siguiente"));
    await fireEvent.press(api.getByTestId("asistente-siguiente"));
    await waitFor(() => api.getByTestId("asistente-existente"));
    expect(api.getByText("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.")).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-existente-editar"));
    expect(onAbrirAgente).toHaveBeenCalledWith("a-9");
  });

  it("el chat de la estación 1 es simulado y no llama a la red", async () => {
    responder();
    const api = await render(<AsistenteDeAgente agentes={[]} onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-vista-previa-quien"));
    const antes = mockGet.mock.calls.length + mockPost.mock.calls.length;
    await fireEvent.press(api.getByTestId("asistente-vista-previa-quien"));
    expect(api.getByText(/Soy Laura, de Panadería La Espiga/)).toBeTruthy();
    expect(api.getByText("Es una vista previa: no le escribe a nadie")).toBeTruthy();
    expect(mockGet.mock.calls.length + mockPost.mock.calls.length).toBe(antes);
  });
});
