import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { SeleccionCarteraScreen } from "./SeleccionCarteraScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { CarteraActivaContext } from "../session/cartera-activa-context";

const cartera = {
  id: 6,
  nombre: "Cartera Centro",
  estatus: "activo",
  tipoInteres: 20,
  numCuotas: 8,
  config: { carteraId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
  permisos: [
    { permiso: "ver_cartera", habilitado: true },
    { permiso: "registrar_pago", habilitado: true },
  ],
};

const diaVacio = { clientes: [], trayectos: null };
const diaConMora = {
  clientes: [
    { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const },
    { clienteId: 2, nombre: "Ana", enTrayecto: false, color: "rojo" as const },
    { clienteId: 3, nombre: "Luis", enTrayecto: false, color: "rojo" as const },
  ],
  trayectos: null,
};

const offline: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  ultimaSincronizacion: null,
  versionRecarga: 0,
  sincronizarGeneral: jest.fn().mockResolvedValue(undefined),
  encolar: jest.fn(),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn(),
};

function apiConCartera(kpis: { clientes: unknown[]; trayectoDiario: unknown } = { clientes: [], trayectoDiario: diaVacio }) {
  return {
    misCarteras: jest.fn().mockResolvedValue([cartera]),
    listarClientesDeCartera: jest.fn().mockResolvedValue(kpis.clientes),
    trayectoDiario: jest.fn().mockResolvedValue(kpis.trayectoDiario),
  };
}

const cartera2 = {
  id: 7,
  nombre: "Cartera Manizales",
  estatus: "activo",
  tipoInteres: 25,
  numCuotas: 10,
  config: { carteraId: 7, periodoLiquidacion: "semanal", cupoDefault: 2000 },
  permisos: [{ permiso: "ver_cartera", habilitado: true }],
};

function apiConCarteras(lista: unknown[]) {
  return {
    misCarteras: jest.fn().mockResolvedValue(lista),
    listarClientesDeCartera: jest.fn().mockResolvedValue([]),
    trayectoDiario: jest.fn().mockResolvedValue(diaVacio),
  };
}

async function renderConCarteras(
  api: Partial<SessionValue["api"]>,
  setCarteraActiva: jest.Mock = jest.fn(),
  onCarteraSeleccionada: jest.Mock = jest.fn(),
  offlineValue: OfflineValue = offline,
) {
  const valor: SessionValue = {
    gestor: {
      id: 20,
      usuario: "gestor1",
      nombre: "Carlos",
      apellido: "López",
      rol: "gestor",
    },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
  };
  return render(
    <OfflineContext.Provider value={offlineValue}>
      <SessionContext.Provider value={valor}>
        <CarteraActivaContext.Provider value={{ carteraActiva: null, setCarteraActiva }}>
          <SeleccionCarteraScreen onCarteraSeleccionada={onCarteraSeleccionada} />
        </CarteraActivaContext.Provider>
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("SeleccionCarteraScreen — selección de cartera", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra el subtítulo 'Selecciona una cartera' y las tarjetas de cartera", async () => {
    const { getByText, getByTestId } = await renderConCarteras(apiConCartera());

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
    expect(getByText("Selecciona una cartera")).toBeTruthy();
  });

  it("muestra los KPIs de la cartera: total clientes, del día, en mora", async () => {
    const clientes = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      carteraId: 6,
      nombre: `C${i}`,
      apellido: "",
      negocio: null,
      telefonoWhatsapp: "+5917000111",
      latitud: -17.78,
      longitud: -63.18,
      latitudDomicilio: null,
      longitudDomicilio: null,
      topeMaximoDeuda: null,
      estatus: "activo",
      colorRiesgo: "azul" as const,
      fotoUrl: null,
      createdAt: "2026-08-01T00:00:00.000Z",
    }));
    const { getByTestId } = await renderConCarteras(
      apiConCartera({ clientes, trayectoDiario: diaConMora }),
    );

    await waitFor(() => expect(getByTestId("kpi-clientes-6")).toBeTruthy());
    expect(getByTestId("kpi-clientes-6").props.children).toBe(5);
    expect(getByTestId("kpi-trayectoDiario-6").props.children).toBe(3);
    expect(getByTestId("kpi-mora-6").props.children).toBe(2);
  });

  it("al tocar una cartera fija la cartera activa y abre la capa de pestañas", async () => {
    const setCarteraActiva = jest.fn();
    const onCarteraSeleccionada = jest.fn();
    const { getByTestId } = await renderConCarteras(
      apiConCarteras([cartera, cartera2]),
      setCarteraActiva,
      onCarteraSeleccionada,
    );

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
    await fireEvent.press(getByTestId("cartera-6"));

    await waitFor(() =>
      expect(setCarteraActiva).toHaveBeenCalledWith({
        carteraId: 6,
        carteraNombre: "Cartera Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: { carteraId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
        permisos: [
          { permiso: "ver_cartera", habilitado: true },
          { permiso: "registrar_pago", habilitado: true },
        ],
      }),
    );
    expect(onCarteraSeleccionada).toHaveBeenCalledTimes(1);
  });

  it("el header de la tarjeta muestra el nombre de la cartera (no el texto activo)", async () => {
    const { getByTestId, getByText, queryByText } = await renderConCarteras(apiConCartera());

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
    expect(getByText("Cartera Centro")).toBeTruthy();
    expect(queryByText("Activa")).toBeNull();
    expect(queryByText("Inactiva")).toBeNull();
  });

  it("pinta la tarjeta inactiva en rojo (chevron visible)", async () => {
    const carteraInactiva = { ...cartera, id: 9, nombre: "Cartera Inactiva", estatus: "bloqueado" };
    const misCarteras = jest.fn().mockResolvedValue([carteraInactiva]);
    const { getByTestId } = await renderConCarteras({
      misCarteras,
      listarClientesDeCartera: jest.fn().mockResolvedValue([]),
      trayectoDiario: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByTestId("filtro-carteras-inactivo")).toBeTruthy());
    fireEvent.press(getByTestId("filtro-carteras-inactivo"));
    await waitFor(() => expect(getByTestId("cartera-9")).toBeTruthy());
    expect(within(getByTestId("cartera-9")).getByText("Cartera Inactiva")).toBeTruthy();
  });

  it("muestra el estado vacío si no hay carteras", async () => {
    const { getByText } = await renderConCarteras({
      misCarteras: jest.fn().mockResolvedValue([]),
    });

    await waitFor(() =>
      expect(getByText("No tienes carteras asignadas.")).toBeTruthy(),
    );
  });

  it("muestra error y permite reintentar cuando falla la carga", async () => {
    const misCarteras = jest
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce([cartera]);
    const { getByTestId, getByText } = await renderConCarteras({
      misCarteras,
      listarClientesDeCartera: jest.fn().mockResolvedValue([]),
      trayectoDiario: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByText("Reintentar")).toBeTruthy());
    await fireEvent.press(getByTestId("reintentar"));

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
  });

  it("muestra el badge de eventos sin subir", async () => {
    const offlineConPendientes: OfflineValue = { ...offline, sinSubir: 2 };
    const valor: SessionValue = {
      gestor: {
        id: 20,
        usuario: "gestor1",
        nombre: "Carlos",
        apellido: "López",
        rol: "gestor",
      },
      loading: false,
      api: apiConCartera() as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
    };
    const { getByTestId } = await render(
      <OfflineContext.Provider value={offlineConPendientes}>
        <SessionContext.Provider value={valor}>
          <CarteraActivaContext.Provider
            value={{ carteraActiva: null, setCarteraActiva: jest.fn() }}
          >
          <SeleccionCarteraScreen />
          </CarteraActivaContext.Provider>
        </SessionContext.Provider>
      </OfflineContext.Provider>,
    );

    await waitFor(() => expect(getByTestId("badge-sin-subir")).toBeTruthy());
  });

  it("atenúa el header de la tarjeta y muestra el punto titilante del estado", async () => {
    const { getByTestId } = await renderConCarteras(apiConCartera());

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());

    expect(getByTestId("cartera-header-6")).toHaveStyle({
      backgroundColor: "#dcfce7",
    });
    expect(getByTestId("color-badge-verde")).toBeTruthy();
    expect(getByTestId("cartera-6")).toHaveStyle({ borderColor: "#bbf7d0" });
  });

  it("usa el pastel rojo en el header de una cartera inactiva", async () => {
    const inactiva = { ...cartera, id: 7, nombre: "Cartera Sur", estatus: "inactivo" };
    const { getByTestId } = await renderConCarteras({
      misCarteras: jest.fn().mockResolvedValue([inactiva]),
      listarClientesDeCartera: jest.fn().mockResolvedValue([]),
      trayectoDiario: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByTestId("filtro-carteras-inactivo")).toBeTruthy());
    fireEvent.press(getByTestId("filtro-carteras-inactivo"));
    await waitFor(() => expect(getByTestId("cartera-7")).toBeTruthy());

    expect(getByTestId("cartera-header-7")).toHaveStyle({
      backgroundColor: "#fee2e2",
    });
    expect(getByTestId("color-badge-rojo")).toBeTruthy();
  });

  it("con una sola cartera, la fija activa y navega automáticamente al detalle (Inicio)", async () => {
    const setCarteraActiva = jest.fn();
    const onCarteraSeleccionada = jest.fn();
    await renderConCarteras(apiConCartera(), setCarteraActiva, onCarteraSeleccionada);

    await waitFor(() => expect(onCarteraSeleccionada).toHaveBeenCalledTimes(1));
    expect(setCarteraActiva).toHaveBeenCalledWith(
      expect.objectContaining({ carteraId: 6, carteraNombre: "Cartera Centro" }),
    );
  });

  it("con varias carteras, no auto-selecciona (espera la elección del gestor)", async () => {
    const onCarteraSeleccionada = jest.fn();
    const { getByTestId } = await renderConCarteras(
      apiConCarteras([cartera, cartera2]),
      jest.fn(),
      onCarteraSeleccionada,
    );

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
    expect(onCarteraSeleccionada).not.toHaveBeenCalled();
  });

  it("no muestra el texto flotante 'Solver'", async () => {
    const { getByTestId, queryByTestId } = await renderConCarteras(
      apiConCarteras([cartera, cartera2]),
    );

    await waitFor(() => expect(getByTestId("cartera-6")).toBeTruthy());
    expect(queryByTestId("cobraia-flotante")).toBeNull();
  });
});
describe("SeleccionCarteraScreen — reintento de sincronización", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra el aviso con botón Reintentar y reintenta el sync", async () => {
    const sincronizar = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderConCarteras(
      apiConCartera(),
      jest.fn(),
      jest.fn(),
      { ...offline, errorSync: "No se pudo sincronizar.", sincronizar },
    );

    await waitFor(() => expect(getByTestId("aviso-error-sync")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-reintentar-sync"));

    await waitFor(() => expect(sincronizar).toHaveBeenCalled());
  });
});
