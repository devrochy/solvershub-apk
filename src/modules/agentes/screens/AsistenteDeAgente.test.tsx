jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { AsistenteDeAgente } from "./AsistenteDeAgente";

jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

const mockGet = jest.fn();
const mockPost = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const ventas = {
  key: "ventas",
  name: "Ventas",
  description: "Vende por chat",
  available: true,
  missing_skills: [],
  superpowers: [],
  requirements: [{ skill: "pack_commerce", kind: "sin_contenido", content: "catalogo", title: "Catálogo", explanation: "" }],
  questions: [
    {
      id: "vende",
      text: "¿Qué vendes?",
      help: "",
      type: "option",
      default: "productos",
      options: [
        { id: "productos", text: "Productos", help: "" },
        { id: "planes", text: "Planes", help: "" },
      ],
    },
  ],
};
const bloqueada = { ...ventas, key: "cobranza", name: "Cobranza", available: false, requirements: [], questions: [] };

describe("AsistenteDeAgente (HU-AOS-56)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/agent-templates") return Promise.resolve({ items: [ventas, bloqueada] });
      if (path.endsWith("/publish-targets"))
        return Promise.resolve({ items: [{ connection_id: "c1", label: "WhatsApp", channel: "whatsapp", covers_skills: true }] });
      return Promise.reject(new Error(path));
    });
  });

  async function hastaRevisar(api: Awaited<ReturnType<typeof render>>) {
    await waitFor(() => api.getByTestId("asistente-tipo"));
    await fireEvent.press(api.getByTestId("asistente-tipo-ventas"));
    await fireEvent.press(api.getByText("Siguiente"));
    await fireEvent.press(api.getByText("Siguiente")); // pregunta (valor por defecto)
    await fireEvent.press(api.getByText("Siguiente")); // nombre
    await fireEvent.press(api.getByText("Siguiente")); // contenido
  }

  it("sin elegir tipo no avanza y avisa", async () => {
    const api = await render(<AsistenteDeAgente onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-tipo"));
    await fireEvent.press(api.getByText("Siguiente"));
    expect(api.getByText("Elige qué quieres que haga tu agente.")).toBeTruthy();
  });

  it("recorre el guion, crea el borrador y publica en la conexión elegida", async () => {
    mockPost.mockImplementation((path: string) =>
      path === "/admin/agents/from-script"
        ? Promise.resolve({ agent: { id: "ag-1" }, draft: {}, warnings: [], requirements: ventas.requirements })
        : Promise.resolve({}),
    );
    const onTerminar = jest.fn();
    const api = await render(<AsistenteDeAgente onTerminar={onTerminar} />);
    await hastaRevisar(api);
    expect(api.getByTestId("asistente-resumen")).toBeTruthy();
    await fireEvent.press(api.getByText("Crear mi agente"));
    await waitFor(() => api.getByTestId("asistente-conexion-c1"));
    expect(mockPost).toHaveBeenCalledWith("/admin/agents/from-script", {
      template_key: "ventas",
      answers: { vende: "productos" },
    });
    await fireEvent.press(api.getByText("Publicar agente"));
    expect(api.getByText("Elige al menos una conexión.")).toBeTruthy();
    await fireEvent.press(api.getByTestId("asistente-conexion-c1"));
    await fireEvent.press(api.getByText("Publicar agente"));
    await waitFor(() => api.getByTestId("asistente-publicado"));
    expect(mockPost).toHaveBeenCalledWith("/admin/agents/ag-1/publish", { connection_ids: ["c1"] });
  });

  it("el paso de contenido ofrece el atajo a la pantalla que lo resuelve", async () => {
    const api = await render(<AsistenteDeAgente onTerminar={jest.fn()} />);
    await waitFor(() => api.getByTestId("asistente-tipo"));
    await fireEvent.press(api.getByTestId("asistente-tipo-ventas"));
    for (let i = 0; i < 3; i += 1) await fireEvent.press(api.getByText("Siguiente"));
    await fireEvent.press(api.getByText("Cargar productos"));
    expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "comercio", pestana: "productos" });
  });

  it("un 409 key_taken avisa que ya existe y conserva las respuestas", async () => {
    mockPost.mockRejectedValue(new AdminApiError(409, "key_taken", "Ya existe un agente de este tipo.", { agent_id: "ag-0" }));
    const api = await render(<AsistenteDeAgente onTerminar={jest.fn()} />);
    await hastaRevisar(api);
    await fireEvent.press(api.getByText("Crear mi agente"));
    await waitFor(() => api.getByText("Ya tienes un agente de este tipo. Edítalo desde el panel web."));
    expect(api.getByTestId("asistente-resumen")).toBeTruthy();
  });

  it("un 422 por pregunta lleva al paso de esa pregunta", async () => {
    mockPost.mockRejectedValue(new AdminApiError(422, "invalid_answers", "Revisa tus respuestas.", { vende: "Opción no válida." }));
    const api = await render(<AsistenteDeAgente onTerminar={jest.fn()} />);
    await hastaRevisar(api);
    await fireEvent.press(api.getByText("Crear mi agente"));
    await waitFor(() => api.getByTestId("asistente-vende"));
  });

  it("sin red al crear conserva lo respondido y deja reintentar", async () => {
    mockPost.mockRejectedValueOnce(new Error("network"));
    const api = await render(<AsistenteDeAgente onTerminar={jest.fn()} />);
    await hastaRevisar(api);
    await fireEvent.press(api.getByText("Crear mi agente"));
    await waitFor(() => api.getByText(/Se cortó la conexión/));
    expect(api.getByText("Crear mi agente")).toBeTruthy();
  });
});
