jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ConsentimientoDelCliente } from "./ConsentimientoDelCliente";

describe("ConsentimientoDelCliente", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ estado: "sin_registro", historial: [] });
    (useAdminApi as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    });
  });

  it("carga el estado y registra el consentimiento con su origen", async () => {
    mockPost.mockResolvedValue({ estado: "otorgado", historial: [] });
    const { findByTestId, getByTestId, findByText } = await render(
      <ConsentimientoDelCliente leadId="c-1" />,
    );
    await fireEvent.press(await findByTestId("consentimiento-marcar"));
    await fireEvent.press(getByTestId("consentimiento-como-por_telefono"));
    await fireEvent.changeText(getByTestId("consentimiento-evidencia"), "Llamada del 21/10");
    await fireEvent.press(getByTestId("consentimiento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", {
        estado: "otorgado",
        como: "por_telefono",
        evidencia: "Llamada del 21/10",
      }),
    );
    expect(await findByText("Acepta promociones")).toBeTruthy();
  });

  it("revoca el consentimiento si ya estaba otorgado", async () => {
    mockGet.mockResolvedValue({
      estado: "otorgado",
      historial: [
        { estado: "otorgado", origen: "ficha", evidencia: "", quien: "Dueña", created_at: "2026-10-21T00:00:00Z" },
      ],
    });
    mockPost.mockResolvedValue({ estado: "revocado", historial: [] });
    const { findByTestId, findByText } = await render(<ConsentimientoDelCliente leadId="c-1" />);
    await fireEvent.press(await findByTestId("consentimiento-revocar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", {
        estado: "revocado",
        como: "otro",
        evidencia: "",
      }),
    );
    expect(await findByText("Se dio de baja")).toBeTruthy();
  });
});
