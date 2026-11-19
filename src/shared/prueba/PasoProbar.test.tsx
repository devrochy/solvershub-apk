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
    mockGet.mockResolvedValueOnce({ turns: [] }).mockResolvedValue({ turns: [{ text: "Hola, soy Laura", escalated: false }] });
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

  it("en Nuevo agente prueba el borrador por su agent_id y cierra al salir", async () => {
    mockGet.mockResolvedValue({ turns: [] });
    const r = await render(<PasoProbar destino={{ agent_id: "a-1" }} nombre="Tomás" sugerencias={[]} />);
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/admin/playground", { agent_id: "a-1" }));
    await r.unmount();
    expect(mockPost).toHaveBeenCalledWith("/admin/playground/close?agent_id=a-1");
  });
});
