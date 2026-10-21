jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ClienteDetalleScreen } from "./ClienteDetalleScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockNavigate = jest.fn();

const FICHA = {
  id: "c-1",
  cliente: "Juana Pérez",
  nombre: "Juana Pérez",
  canal: "whatsapp",
  identificador: "whatsapp:+573001112233",
  telefono: "+573001112233",
  bot_paused: false,
  alta: "2026-10-21T00:00:00Z",
  conexiones: [{ id: "x", label: "WhatsApp Tienda", channel: "whatsapp" }],
  ultima_conversacion_id: "cv-9",
  datos: [
    { namespace: "perfil", key: "direccion", value: "Calle 12", source: "tool", data_class: "pii", valid_from: "2026-10-21T10:00:00Z" },
    { namespace: "ventas", key: "talla", value: "M", source: "tool", data_class: "internal", valid_from: "2026-10-21T10:00:00Z" },
  ],
  extras: { clasificacion: "Fiel" },
  columns: [{ key: "clasificacion", label: "Clasificación" }],
};

const NOTAS = [
  { id: "n-1", text: "Prefiere entregas en la tarde", author: "duena@test.example", created_at: "2026-10-21T10:00:00Z", puede_borrar: true },
];
const HISTORIA = {
  items: [
    { at: "2026-10-21T10:00:00Z", kind: "conversacion", title: "Escribió por WhatsApp Tienda", link_kind: "conversation", link_id: "cv-9" },
    { at: "2026-10-20T10:00:00Z", kind: "pedido", title: "Pedido OC-0001 por $50.000", detail: "Pago pendiente", link_kind: "order", link_id: "o-1" },
  ],
  next_cursor: null,
  partial: false,
};

async function pantalla() {
  const props = {
    route: { key: "k", name: "ClienteDetalle", params: { id: "c-1", titulo: "Juana" } },
    navigation: { navigate: mockNavigate },
  } as unknown as Parameters<typeof ClienteDetalleScreen>[0];
  return await render(<ClienteDetalleScreen {...props} />);
}

describe("ClienteDetalleScreen (HU-CRM-02)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({ get: mockGet, post: mockPost, patch: mockPatch, put: jest.fn(), del: jest.fn() });
    mockGet.mockImplementation((path: string) => {
      if (path.endsWith("/notes")) return Promise.resolve(NOTAS);
      if (path.endsWith("/timeline")) return Promise.resolve(HISTORIA);
      return Promise.resolve(FICHA);
    });
  });

  it("muestra la ficha con la clasificación y lo que sabemos (solo el perfil)", async () => {
    const { findByText, queryByTestId, getByText } = await pantalla();
    expect(await findByText("Calle 12")).toBeTruthy();
    expect(getByText("Fiel")).toBeTruthy();
    expect(getByText("Asistente")).toBeTruthy();
    expect(queryByTestId("cliente-dato-talla")).toBeNull();
    expect(mockGet).toHaveBeenCalledWith("/admin/leads/c-1");
  });

  it("pausa el agente para el cliente", async () => {
    mockPost.mockResolvedValue({ bot_paused: true });
    const { findByTestId, getByText } = await pantalla();
    await fireEvent(await findByTestId("cliente-agente"), "valueChange", false);
    await waitFor(() => expect(getByText("Pausado para este cliente")).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/toggle-bot");
  });

  it("corrige solo los datos cambiados", async () => {
    mockPatch.mockResolvedValue({
      ...FICHA,
      datos: [{ ...FICHA.datos[0], value: "Carrera 7", source: "human" }],
    });
    const { findByTestId, getByTestId, findByText } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-editar"));
    await fireEvent.changeText(getByTestId("cliente-campo-direccion"), "Carrera 7");
    await fireEvent.press(getByTestId("cliente-guardar"));
    expect(await findByText("Carrera 7")).toBeTruthy();
    expect(mockPatch).toHaveBeenCalledWith("/admin/leads/c-1", { datos: { direccion: "Carrera 7" } });
  });

  it("abre la última conversación", async () => {
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-abrir-conversacion"));
    expect(mockNavigate).toHaveBeenCalledWith("ConversacionDetalle", { id: "cv-9", titulo: "Juana Pérez" });
  });

  it("muestra notas e historia y guarda una nota nueva", async () => {
    mockPost.mockResolvedValue({ ...NOTAS[0], id: "n-2", text: "No llamar antes de las 10" });
    const { findByText, getByTestId, getByText } = await pantalla();
    expect(await findByText("Prefiere entregas en la tarde")).toBeTruthy();
    expect(getByText("Pedido OC-0001 por $50.000")).toBeTruthy();
    await fireEvent.changeText(getByTestId("nota-nueva"), "No llamar antes de las 10");
    await fireEvent.press(getByTestId("nota-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/notes", { text: "No llamar antes de las 10" }),
    );
  });

  it("un evento de conversación abre el chat", async () => {
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("evento-0"));
    expect(mockNavigate).toHaveBeenCalledWith("ConversacionDetalle", { id: "cv-9", titulo: "Juana Pérez" });
  });
});
