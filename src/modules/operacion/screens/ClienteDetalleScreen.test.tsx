jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: { token: "t", role: "master", tenantRole: "owner", permissions: { leads: "write" } },
    loading: false,
  }),
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ClienteDetalleScreen } from "./ClienteDetalleScreen";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockNavigate = jest.fn();

const PERFIL = {
  nombre_visible: "Juana Pérez",
  name: "Juana",
  apellido: "Pérez",
  alias: "Juanita",
  phone_e164: "+573001112233",
  phone_indicativo: "+57",
  phone_local: "300 111 2233",
  email: "juana@example.com",
  tipo_documento: "cc",
  id_document: "123",
  address: "Calle 12",
  direccion_normalizada: "Calle 12 # 3-4",
  municipio: "Bogotá",
  departamento: "Cundinamarca",
  pais: "Colombia",
  latitud: 4.6,
  longitud: -74.1,
  mapa_url: "https://maps.example.com/1",
  avatar_url: null,
  clasificacion: "cliente",
  clasificacion_label: "Cliente",
  geocodificacion_precision: "exacta",
  geocodificado_en: "2026-10-21T00:00:00Z",
};

const CAMPOS = [
  { group: "identidad", key: "name", label: "Nombre", tipo: "texto", max_length: 120, options: [], required: true },
  { group: "identidad", key: "apellido", label: "Apellido", tipo: "texto", max_length: 120, options: [], required: false },
  { group: "contacto", key: "phone", label: "Teléfono", tipo: "telefono", max_length: 30, options: [], required: false },
  { group: "contacto", key: "email", label: "Correo", tipo: "email", max_length: 120, options: [], required: false },
  { group: "ubicacion", key: "address", label: "Dirección", tipo: "texto", max_length: 200, options: [], required: false },
  { group: "ubicacion", key: "municipio", label: "Municipio", tipo: "texto", max_length: 80, options: [], required: false },
  { group: "ubicacion", key: "departamento", label: "Departamento", tipo: "texto", max_length: 80, options: [], required: false },
  {
    group: "clasificacion",
    key: "clasificacion",
    label: "Clasificación",
    tipo: "opciones",
    max_length: 30,
    options: [{ value: "cliente", label: "Cliente" }, { value: "vip", label: "VIP" }],
    required: false,
  },
];

const EDITABLES = [
  {
    plugin_id: "pack_commerce",
    key: "estado_lead",
    label: "Estado del lead",
    tipo: "opciones",
    max_length: 200,
    value: "calificado",
    options: [{ value: "calificado", label: "Calificado" }, { value: "perdido", label: "Perdido" }],
  },
  { plugin_id: "pack_commerce", key: "interes", label: "Interés", tipo: "texto", max_length: 500, value: "plan basic" },
];

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
  perfil: PERFIL,
  campos_perfil: CAMPOS,
  agentes: [
    { key: "general", name: "General", columns: [], editables: [] },
    {
      key: "ventas",
      name: "Ventas",
      columns: [{ key: "estado_lead", label: "Estado del lead", value: "Calificado" }],
      editables: EDITABLES,
    },
  ],
  datos: [
    { namespace: "perfil", key: "direccion", value: "Calle 12", source: "tool", data_class: "pii", valid_from: "2026-10-21T10:00:00Z" },
    { namespace: "ventas", key: "talla", value: "M", source: "tool", data_class: "internal", valid_from: "2026-10-21T10:00:00Z" },
  ],
  extras: { clasificacion: "cliente", estado_lead: "Calificado", interes: "plan basic" },
  columns: [{ key: "clasificacion", label: "Clasificación" }],
  editables: EDITABLES,
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

describe("ClienteDetalleScreen (HU-CRM-02 + tanda 1A)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockPost.mockReset();
    mockPatch.mockReset();
    (useAdminApi as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      put: jest.fn(),
      del: jest.fn(),
    });
    mockGet.mockImplementation((path: string) => {
      if (path.endsWith("/notes")) return Promise.resolve(NOTAS);
      if (path.endsWith("/timeline")) return Promise.resolve(HISTORIA);
      if (path.endsWith("/consentimiento")) return Promise.resolve({ estado: "sin_registro", historial: [] });
      return Promise.resolve(FICHA);
    });
  });

  it("muestra la ficha con perfil, clasificación y lo que sabe cada agente", async () => {
    const { findByText, getByTestId, getByText } = await pantalla();
    expect(await findByText("Juana Pérez")).toBeTruthy();
    expect(getByTestId("cliente-clasificacion")).toBeTruthy();
    expect(getByText("Calle 12")).toBeTruthy();
    expect(getByText("WhatsApp Tienda")).toBeTruthy();
    expect(getByText("Otros datos que guardó el agente")).toBeTruthy();
    expect(getByText("M")).toBeTruthy();
    expect(mockGet).toHaveBeenCalledWith("/admin/leads/c-1");
  });

  it("pausa el agente para el cliente", async () => {
    mockPost.mockResolvedValue({ bot_paused: true });
    const { findByTestId, getByText } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-agente"));
    await waitFor(() => expect(getByText("Pausado solo para este cliente")).toBeTruthy());
    expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/toggle-bot");
  });

  it("corrige el perfil con el endpoint de perfil", async () => {
    mockPatch.mockResolvedValue({ ...FICHA, perfil: { ...PERFIL, address: "Carrera 7" } });
    const { findByTestId, getByTestId, findByText } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-editar"));
    await fireEvent.changeText(getByTestId("perfil-address"), "Carrera 7");
    await fireEvent.press(getByTestId("perfil-guardar"));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/admin/leads/c-1/perfil", {
        valores: { address: "Carrera 7" },
        otros: {},
      }),
    );
    expect(await findByText("Carrera 7")).toBeTruthy();
  });

  it("geocodifica la dirección", async () => {
    mockPost.mockResolvedValue({ perfil: { ...PERFIL, latitud: 1, longitud: 2 }, latitud: 1, longitud: 2, proveedor: "test" });
    const { findByTestId, findByText } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-geocodificar"));
    expect(await findByText("Dirección ubicada en el mapa.")).toBeTruthy();
    expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/geocodificar");
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

  it("cambia el estado del lead de venta en la pestaña del agente", async () => {
    mockPatch.mockResolvedValue({ ...FICHA, agentes: FICHA.agentes.map((a) => (a.key === "ventas" ? { ...a, editables: [{ ...EDITABLES[0], value: "perdido" }, EDITABLES[1]] } : a)) });
    const { findByTestId, getByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("cliente-tab-ventas"));
    await fireEvent.press(getByTestId("pack-estado_lead-perdido"));
    await fireEvent.press(getByTestId("pack-pack_commerce-guardar"));
    await waitFor(() =>
      expect(mockPatch).toHaveBeenCalledWith("/admin/leads/c-1/pack/pack_commerce", {
        valores: { estado_lead: "perdido" },
      }),
    );
  });

  it("marca el consentimiento de promociones", async () => {
    mockPost.mockResolvedValue({ estado: "otorgado", historial: [] });
    const { findByTestId, getByTestId, findByText } = await pantalla();
    await fireEvent.press(await findByTestId("consentimiento-marcar"));
    await fireEvent.press(getByTestId("consentimiento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", {
        estado: "otorgado",
        como: "en_el_local",
        evidencia: "",
      }),
    );
    expect(await findByText("Acepta promociones")).toBeTruthy();
  });

  it("un evento de conversación abre el chat", async () => {
    const { findByTestId } = await pantalla();
    await fireEvent.press(await findByTestId("evento-0"));
    expect(mockNavigate).toHaveBeenCalledWith("ConversacionDetalle", { id: "cv-9", titulo: "Juana Pérez" });
  });
});
