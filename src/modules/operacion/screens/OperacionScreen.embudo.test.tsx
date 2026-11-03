jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: { token: "t", role: "master", tenantRole: "owner", permissions: {} },
    loading: false,
  }),
}));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAdminApi } from "@core/session/use-admin-api";
import { OperacionScreen } from "./OperacionScreen";

// HU-CRM-24: vista «Embudo» de Clientes en la APK: pestañas de etapa con cantidad y suma, la lista de la
// etapa elegida pedida al servidor con `filtro=estado_lead:<etapa>`, y el cambio de etapa con la hoja de
// siempre (sin arrastrar).

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const ETAPAS = ["nuevo", "calificado", "contactado", "convertido", "perdido"].map((v) => ({
  value: v,
  label: v[0].toUpperCase() + v.slice(1),
}));
const MOTIVOS = {
  key: "motivo_perdida",
  label: "Motivo de pérdida",
  options: [
    { value: "precio", label: "Precio" },
    { value: "sin_motivo", label: "Sin motivo registrado" },
  ],
};

let facetas: unknown[];
let respuestaPorEtapa: Record<string, { items: unknown[]; total: number }>;

const lead = (id: string, nombre: string, etapa: string, extras: Record<string, unknown> = {}) => ({
  id,
  cliente: nombre,
  canal: "whatsapp",
  telefono: "+57 300 111 2233",
  alta: "2026-10-01",
  extras: { estado_lead: etapa, ...extras },
  agentes: ["general", "ventas"],
  bot_paused: false,
  perfil: { nombre_visible: nombre, phone_indicativo: "+57", phone_local: "300 111 2233", clasificacion: "cliente" },
});

/** Texto de un `Text` cuyo contenido se arma con varias expresiones. */
const textoDe = (nodo: { props: Record<string, unknown> }) => [nodo.props.children].flat().join("");

const llamadasALeads = () => mockGet.mock.calls.filter(([path]) => path === "/admin/leads").map(([, p]) => p);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseAdminApi.mockReturnValue(cliente);
  facetas = [
    {
      key: "estado_lead",
      counts: { nuevo: 3, calificado: 1, contactado: 0, convertido: 0, perdido: 0 },
      sin_valor: 2,
      total: 6,
      sumas: { nuevo: 1500000, calificado: 250000, contactado: 0, convertido: 0, perdido: 0, sin_valor: 0 },
    },
  ];
  respuestaPorEtapa = {
    nuevo: { items: [lead("l-1", "Ana Nueva", "Nuevo", { valor_estimado: 500000 })], total: 3 },
    calificado: { items: [lead("l-2", "Carla Calificada", "Calificado")], total: 1 },
  };
  mockGet.mockImplementation(async (path: string, params?: { filtro?: string[]; facetas?: string[] }) => {
    if (path === "/admin/conversations/connections") return [];
    if (path === "/admin/leads") {
      const etapa = params?.filtro?.find((f) => f.startsWith("estado_lead:"))?.slice("estado_lead:".length);
      const vacia = { items: [], total: 0 };
      const { items, total } = etapa ? (respuestaPorEtapa[etapa] ?? vacia) : { items: [lead("l-1", "Ana Nueva", "Nuevo")], total: 6 };
      return {
        items,
        page: 1,
        total,
        has_more: false,
        agents: [{ key: "ventas", name: "Ventas", columns: [] }],
        filters: [{ key: "estado_lead", label: "Etapa", options: ETAPAS }, MOTIVOS],
        facetas: params?.facetas?.includes("estado_lead") ? facetas : undefined,
      };
    }
    throw new Error(`no mockeado: ${path}`);
  });
});

async function abrirEmbudo() {
  const pantalla = await render(<OperacionScreen pestanaInicial={{ pestana: "leads", n: 1 }} />);
  await waitFor(() => expect(pantalla.getByTestId("lista-leads")).toBeTruthy());
  await fireEvent.press(pantalla.getByTestId("clientes-vista-embudo"));
  await waitFor(() => expect(pantalla.getByTestId("embudo-etapa-nuevo")).toBeTruthy());
  return pantalla;
}

describe("Clientes › Embudo (HU-CRM-24)", () => {
  it("ofrece Lista y Embudo, y la lista no pide contadores", async () => {
    const { getByTestId } = await render(<OperacionScreen pestanaInicial={{ pestana: "leads", n: 1 }} />);
    await waitFor(() => expect(getByTestId("clientes-vista-embudo")).toBeTruthy());
    expect(getByTestId("clientes-vista-lista").props.accessibilityState.selected).toBe(true);
    expect(llamadasALeads()[0]).toEqual(expect.objectContaining({ facetas: undefined, resumen: undefined }));
  });

  it("al abrir el Embudo muestra una pestaña por etapa con su cantidad y la suma de la etapa elegida", async () => {
    const { getByTestId, getByLabelText } = await abrirEmbudo();

    // Los contadores llegan con la primera respuesta del Embudo.
    await waitFor(() => expect(getByLabelText("Nuevo, 3 clientes")).toBeTruthy());
    expect(getByLabelText("Calificado, 1 cliente")).toBeTruthy();
    expect(getByLabelText("Perdido, 0 clientes")).toBeTruthy();
    expect(getByTestId("embudo-etapa-nuevo").props.accessibilityState.selected).toBe(true);
    await waitFor(() => expect(textoDe(getByTestId("embudo-suma"))).toBe("$ 1.500.000 en Nuevo"));
    await waitFor(() => expect(getByTestId("lead-etapa-l-1")).toBeTruthy());
    expect(getByTestId("lead-valor-l-1")).toBeTruthy();
  });

  it("pide la etapa como filtro, con los contadores y las sumas, y conserva la búsqueda", async () => {
    const { getByTestId } = await render(<OperacionScreen pestanaInicial={{ pestana: "leads", n: 1 }} />);
    await waitFor(() => expect(getByTestId("clientes-vista-embudo")).toBeTruthy());
    await fireEvent.changeText(getByTestId("clientes-busqueda"), "ana");
    await fireEvent.press(getByTestId("clientes-vista-embudo"));

    await waitFor(() =>
      expect(llamadasALeads()).toContainEqual(
        expect.objectContaining({
          q: "ana",
          filtro: ["estado_lead:nuevo"],
          facetas: ["estado_lead"],
          resumen: "valor",
          page_size: 20,
        }),
      ),
    );
  });

  it("elegir otra pestaña carga esa etapa y los otros filtros se conservan sin la etapa anterior", async () => {
    const { getByTestId, getByText } = await abrirEmbudo();
    await fireEvent.press(getByTestId("embudo-etapa-calificado"));

    await waitFor(() => expect(getByText("Carla Calificada")).toBeTruthy());
    const ultima = llamadasALeads().at(-1) as { filtro: string[] };
    expect(ultima.filtro).toEqual(["estado_lead:calificado"]);
    await waitFor(() => expect(textoDe(getByTestId("embudo-suma"))).toBe("$ 250.000 en Calificado"));
  });

  it("cambia la etapa con la hoja de siempre, vuelve a pedir la etapa y las cantidades", async () => {
    cliente.patch.mockResolvedValue({});
    const { getByTestId } = await abrirEmbudo();
    await waitFor(() => expect(getByTestId("lead-etapa-l-1")).toBeTruthy());
    const antes = llamadasALeads().length;

    await fireEvent.press(getByTestId("lead-etapa-l-1"));
    await fireEvent.press(await waitFor(() => getByTestId("etapa-contactado")));

    await waitFor(() =>
      expect(cliente.patch).toHaveBeenCalledWith("/admin/leads/l-1/pack/pack_commerce", {
        valores: { estado_lead: "contactado" },
      }),
    );
    // Tras guardar se pide otra vez la primera página de la etapa (no la siguiente, que se saltaría a alguien).
    await waitFor(() => expect(llamadasALeads().length).toBeGreaterThan(antes));
    expect(llamadasALeads().at(-1)).toEqual(expect.objectContaining({ filtro: ["estado_lead:nuevo"], page: 1 }));
  });

  it("pasar a perdido pide el motivo también desde el Embudo", async () => {
    const { getByTestId, getByText } = await abrirEmbudo();
    await waitFor(() => expect(getByTestId("lead-etapa-l-1")).toBeTruthy());
    await fireEvent.press(getByTestId("lead-etapa-l-1"));
    await fireEvent.press(await waitFor(() => getByTestId("etapa-perdido")));
    await waitFor(() => expect(getByText("¿Por qué se perdió?")).toBeTruthy());
    expect(cliente.patch).not.toHaveBeenCalled();
  });

  it("una etapa sin clientes dice que no hay y sugiere otra, sin esconder las pestañas", async () => {
    const { getByTestId, getByText } = await abrirEmbudo();
    await fireEvent.press(getByTestId("embudo-etapa-perdido"));
    await waitFor(() => expect(getByText("Sin clientes en esta etapa")).toBeTruthy());
    expect(getByTestId("embudo-etapa-nuevo")).toBeTruthy();
  });

  it("sin leads en ninguna etapa muestra el vacío de Clientes y no las pestañas", async () => {
    facetas = [
      {
        key: "estado_lead",
        counts: { nuevo: 0, calificado: 0, contactado: 0, convertido: 0, perdido: 0 },
        sin_valor: 0,
        total: 0,
      },
    ];
    respuestaPorEtapa = {};
    const pantalla = await render(<OperacionScreen pestanaInicial={{ pestana: "leads", n: 1 }} />);
    await waitFor(() => expect(pantalla.getByTestId("clientes-vista-embudo")).toBeTruthy());
    await fireEvent.press(pantalla.getByTestId("clientes-vista-embudo"));
    await waitFor(() => expect(pantalla.getByText("Sin clientes todavía")).toBeTruthy());
    expect(pantalla.queryByTestId("embudo-etapa-nuevo")).toBeNull();
  });

  it("sin contadores en el servidor (versión anterior) las pestañas salen sin cantidad ni suma", async () => {
    facetas = [];
    const { getByTestId, queryByTestId } = await abrirEmbudo();
    await waitFor(() => expect(getByTestId("lead-etapa-l-1")).toBeTruthy());
    expect(getByTestId("embudo-etapa-nuevo").props.accessibilityLabel).toBe("Nuevo");
    expect(queryByTestId("embudo-suma")).toBeNull();
    expect(getByTestId("embudo-etapa-calificado")).toBeTruthy();
  });

  it("volver a la Lista pide la lista completa sin etapa ni contadores", async () => {
    const { getByTestId } = await abrirEmbudo();
    await fireEvent.press(getByTestId("clientes-vista-lista"));
    await waitFor(() => expect(getByTestId("lista-leads")).toBeTruthy());
    await waitFor(() => expect(llamadasALeads().at(-1)).toEqual(expect.objectContaining({ filtro: undefined, facetas: undefined })));
  });
});
