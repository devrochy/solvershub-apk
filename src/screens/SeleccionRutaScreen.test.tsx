import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { SeleccionRutaScreen } from "./SeleccionRutaScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";

const ruta = {
  id: 6,
  nombre: "Ruta Centro",
  estatus: "activo",
  tipoInteres: 20,
  numCuotas: 8,
  config: { rutaId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
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

function apiConRuta(kpis: { clientes: unknown[]; dia: unknown } = { clientes: [], dia: diaVacio }) {
  return {
    misRutas: jest.fn().mockResolvedValue([ruta]),
    listarClientesDeRuta: jest.fn().mockResolvedValue(kpis.clientes),
    dia: jest.fn().mockResolvedValue(kpis.dia),
  };
}

async function renderConRutas(
  api: Partial<SessionValue["api"]>,
  setRutaActiva: jest.Mock = jest.fn(),
  onRutaSeleccionada: jest.Mock = jest.fn(),
) {
  const valor: SessionValue = {
    cobrador: {
      id: 20,
      usuario: "cobrador1",
      nombre: "Carlos",
      apellido: "López",
      rol: "cobrador",
    },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
  };
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider value={{ rutaActiva: null, setRutaActiva }}>
          <SeleccionRutaScreen onRutaSeleccionada={onRutaSeleccionada} />
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("SeleccionRutaScreen — selección de ruta", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra el subtítulo 'Selecciona una ruta' y las tarjetas de ruta", async () => {
    const { getByText, getByTestId } = await renderConRutas(apiConRuta());

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
    expect(getByText("Selecciona una ruta")).toBeTruthy();
  });

  it("muestra los KPIs de la ruta: total clientes, del día, en mora", async () => {
    const clientes = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      rutaId: 6,
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
    const { getByTestId } = await renderConRutas(
      apiConRuta({ clientes, dia: diaConMora }),
    );

    await waitFor(() => expect(getByTestId("kpi-clientes-6")).toBeTruthy());
    expect(getByTestId("kpi-clientes-6").props.children).toBe(5);
    expect(getByTestId("kpi-dia-6").props.children).toBe(3);
    expect(getByTestId("kpi-mora-6").props.children).toBe(2);
  });

  it("al tocar una ruta fija la ruta activa y abre la capa de pestañas", async () => {
    const setRutaActiva = jest.fn();
    const onRutaSeleccionada = jest.fn();
    const { getByTestId } = await renderConRutas(
      apiConRuta(),
      setRutaActiva,
      onRutaSeleccionada,
    );

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
    await fireEvent.press(getByTestId("ruta-6"));

    await waitFor(() =>
      expect(setRutaActiva).toHaveBeenCalledWith({
        rutaId: 6,
        rutaNombre: "Ruta Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: { rutaId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
        permisos: [
          { permiso: "ver_cartera", habilitado: true },
          { permiso: "registrar_pago", habilitado: true },
        ],
      }),
    );
    expect(onRutaSeleccionada).toHaveBeenCalledTimes(1);
  });

  it("el header de la tarjeta muestra el nombre de la ruta (no el texto activo)", async () => {
    const { getByTestId, getByText, queryByText } = await renderConRutas(apiConRuta());

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
    expect(getByText("Ruta Centro")).toBeTruthy();
    expect(queryByText("Activa")).toBeNull();
    expect(queryByText("Inactiva")).toBeNull();
  });

  it("pinta la tarjeta inactiva en rojo (chevron visible)", async () => {
    const rutaInactiva = { ...ruta, id: 9, nombre: "Ruta Inactiva", estatus: "bloqueado" };
    const misRutas = jest.fn().mockResolvedValue([rutaInactiva]);
    const { getByTestId } = await renderConRutas({
      misRutas,
      listarClientesDeRuta: jest.fn().mockResolvedValue([]),
      dia: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByTestId("ruta-9")).toBeTruthy());
    expect(within(getByTestId("ruta-9")).getByText("Ruta Inactiva")).toBeTruthy();
  });

  it("muestra el estado vacío si no hay rutas", async () => {
    const { getByText } = await renderConRutas({
      misRutas: jest.fn().mockResolvedValue([]),
    });

    await waitFor(() =>
      expect(getByText("No tienes rutas asignadas.")).toBeTruthy(),
    );
  });

  it("muestra error y permite reintentar cuando falla la carga", async () => {
    const misRutas = jest
      .fn()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValueOnce([ruta]);
    const { getByTestId, getByText } = await renderConRutas({
      misRutas,
      listarClientesDeRuta: jest.fn().mockResolvedValue([]),
      dia: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByText("Reintentar")).toBeTruthy());
    await fireEvent.press(getByTestId("reintentar"));

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
  });

  it("muestra el badge de eventos sin subir", async () => {
    const offlineConPendientes: OfflineValue = { ...offline, sinSubir: 2 };
    const valor: SessionValue = {
      cobrador: {
        id: 20,
        usuario: "cobrador1",
        nombre: "Carlos",
        apellido: "López",
        rol: "cobrador",
      },
      loading: false,
      api: apiConRuta() as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
    };
    const { getByTestId } = await render(
      <OfflineContext.Provider value={offlineConPendientes}>
        <SessionContext.Provider value={valor}>
          <RutaActivaContext.Provider
            value={{ rutaActiva: null, setRutaActiva: jest.fn() }}
          >
          <SeleccionRutaScreen />
          </RutaActivaContext.Provider>
        </SessionContext.Provider>
      </OfflineContext.Provider>,
    );

    await waitFor(() => expect(getByTestId("badge-sin-subir")).toBeTruthy());
  });

  it("atenúa el header de la tarjeta y muestra el punto titilante del estado", async () => {
    const { getByTestId } = await renderConRutas(apiConRuta());

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());

    expect(getByTestId("ruta-header-6")).toHaveStyle({
      backgroundColor: "#dcfce7",
    });
    expect(getByTestId("color-badge-verde")).toBeTruthy();
    expect(getByTestId("ruta-6")).toHaveStyle({ borderColor: "#bbf7d0" });
  });

  it("usa el pastel rojo en el header de una ruta inactiva", async () => {
    const inactiva = { ...ruta, id: 7, nombre: "Ruta Sur", estatus: "inactivo" };
    const { getByTestId } = await renderConRutas({
      misRutas: jest.fn().mockResolvedValue([inactiva]),
      listarClientesDeRuta: jest.fn().mockResolvedValue([]),
      dia: jest.fn().mockResolvedValue(diaVacio),
    });

    await waitFor(() => expect(getByTestId("ruta-7")).toBeTruthy());

    expect(getByTestId("ruta-header-7")).toHaveStyle({
      backgroundColor: "#fee2e2",
    });
    expect(getByTestId("color-badge-rojo")).toBeTruthy();
  });
});