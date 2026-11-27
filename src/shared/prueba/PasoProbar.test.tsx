jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { PasoProbar } from "./PasoProbar";

const mockGet = jest.fn();
const mockPost = jest.fn();

describe("PasoProbar compartido (HU-APP-23)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({ get: mockGet, post: mockPost });
    mockPost.mockResolvedValue(undefined);
  });

  it("en la bienvenida prueba por la conexión y avisa cuando el agente responde", async () => {
    mockGet.mockResolvedValueOnce({ turns: [] }).mockResolvedValue({
      turns: [
        { role: "user", content: "¿Qué venden?", tool_calls: [] },
        { role: "assistant", content: "Hola, soy Laura", tool_calls: [] },
      ],
    });
    mockPost.mockResolvedValue({ text: "Hola, soy Laura", escalated: false });
    const alRecibir = jest.fn();
    const r = await render(
      <PasoProbar destino={{ connection_id: "c-1" }} nombre="Laura" sugerencias={["¿Qué venden?"]} prefijo="onb" alRecibir={alRecibir} />,
    );
    await fireEvent.press(r.getByTestId("onb-prueba-¿Qué venden?"));
    await waitFor(() => r.getByText("Hola, soy Laura"));
    expect(mockPost).toHaveBeenCalledWith("/admin/playground/message", { text: "¿Qué venden?", connection_id: "c-1" });
    expect(mockGet).toHaveBeenCalledWith("/admin/playground", { connection_id: "c-1" });
    expect(alRecibir).toHaveBeenCalled();
  });

  it("pinta el historial real del servidor ({role, content}): la burbuja del agente lleva su texto", async () => {
    // Forma real de `GET /admin/playground` (memoria de trabajo): los dos lados, con `content` y sin `text`.
    mockGet.mockResolvedValue({
      turns: [
        { role: "user", content: "¿A qué hora abren?", tool_calls: [] },
        { role: "assistant", content: "Abrimos a las 8 de la mañana", tool_calls: [] },
      ],
    });
    const r = await render(<PasoProbar destino={{ connection_id: "c-1" }} nombre="Laura" sugerencias={[]} />);
    await waitFor(() => r.getByText("Abrimos a las 8 de la mañana"));
    expect(r.getByLabelText("Laura: Abrimos a las 8 de la mañana")).toBeTruthy();
    expect(r.getByLabelText("Tú: ¿A qué hora abren?")).toBeTruthy();
    expect(r.queryByLabelText(/undefined/)).toBeNull();
    // Lo del cliente sale una sola vez y no como si lo hubiera dicho el agente.
    expect(r.queryByLabelText("Laura: ¿A qué hora abren?")).toBeNull();
    expect(r.getAllByText("¿A qué hora abren?")).toHaveLength(1);
  });

  it("si el turno pasó a una persona no cuenta como prueba (lo dice la respuesta del envío)", async () => {
    mockGet.mockResolvedValueOnce({ turns: [] }).mockResolvedValue({
      turns: [
        { role: "user", content: "Hola", tool_calls: [] },
        { role: "assistant", content: "Te paso con alguien del equipo", tool_calls: [] },
      ],
    });
    mockPost.mockResolvedValue({ text: "Te paso con alguien del equipo", escalated: true });
    const alRecibir = jest.fn();
    const r = await render(
      <PasoProbar destino={{ connection_id: "c-1" }} nombre="Laura" sugerencias={["Hola"]} prefijo="onb" alRecibir={alRecibir} />,
    );
    await fireEvent.press(r.getByTestId("onb-prueba-Hola"));
    await waitFor(() => r.getByText("Te paso con alguien del equipo"));
    expect(alRecibir).not.toHaveBeenCalled();
  });

  it("en Nuevo agente prueba el borrador por su agent_id y cierra al salir", async () => {
    mockGet.mockResolvedValue({ turns: [] });
    const r = await render(<PasoProbar destino={{ agent_id: "a-1" }} nombre="Tomás" sugerencias={[]} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/admin/playground", { agent_id: "a-1" }));
    await r.unmount();
    expect(mockPost).toHaveBeenCalledWith("/admin/playground/close?agent_id=a-1");
  });
});
