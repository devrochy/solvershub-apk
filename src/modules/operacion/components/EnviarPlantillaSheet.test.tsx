jest.mock("expo-crypto", () => ({ randomUUID: () => "clave-test" }));
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { EnviarPlantillaSheet } from "./EnviarPlantillaSheet";

const CONEXIONES = [
  {
    id: "cx-1",
    label: "WhatsApp Tienda",
    motivo_pausa: null,
    plantillas: [
      { id: "t-1", name: "Promo", language: "es", body: "Hola {{1}}", variables: ["1"] },
    ],
  },
];

const VISTA = {
  candidatos: 1,
  elegibles: 1,
  excluidos: [],
  muestra: ["Juana"],
  texto: "Hola Juana",
  bloqueo: null,
  envio_id: "env-1",
  tope: 100,
  costo_creditos: "0",
  expira: null,
  limite_diario: null,
};

const ENVIO = {
  id: "env-1",
  plantilla: "Promo",
  total: 1,
  conteo: { queued: 1 },
  fallas: [],
  estado: "confirmado",
  confirmed_at: null,
  created_at: "2026-10-21T00:00:00Z",
  finished_at: null,
  creado_por: "Dueña",
};

describe("EnviarPlantillaSheet", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue(CONEXIONES);
    mockPost.mockImplementation((path: string) => {
      if (path.includes("vista-previa")) return Promise.resolve(VISTA);
      if (path.endsWith("/confirmar")) return Promise.resolve(ENVIO);
      return Promise.resolve({});
    });
    (useAdminApi as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    });
  });

  it("arma la vista previa y confirma el envío con idempotencia", async () => {
    const { findByTestId, getByTestId, findByText } = await render(
      <EnviarPlantillaSheet visible onClose={jest.fn()} leadId="c-1" nombre="Juana" />,
    );
    await findByTestId("plantilla-ver-vista");
    await fireEvent.press(getByTestId("plantilla-ver-vista"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/acciones/plantilla/vista-previa?lead_id=c-1", {
        connection_id: "cx-1",
        template_id: "t-1",
        variables: { "1": { fuente: "cliente.nombre", valor: "" } },
      }),
    );
    expect(await findByText("Hola Juana")).toBeTruthy();
    await fireEvent.press(getByTestId("plantilla-confirmar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/leads/acciones/plantilla/env-1/confirmar",
        undefined,
        { "Idempotency-Key": "clave-test" },
      ),
    );
    expect(await findByText("Promo · 1 cliente")).toBeTruthy();
  });
});
