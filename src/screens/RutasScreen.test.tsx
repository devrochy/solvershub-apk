import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { RutasScreen } from "./RutasScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";
import { PantallaActivaContext } from "../navigation/pantalla-activa-context";

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
  navigate: jest.Mock = jest.fn(),
  setRutaActiva: jest.Mock = jest.fn(),
  abrir: jest.Mock = jest.fn(),
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
  };
  const navigation = { navigate } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider value={{ rutaActiva: null, setRutaActiva }}>
          <PantallaActivaContext.Provider value={{ pantalla: null, abrir, cerrar: jest.fn() }}>
            <RutasScreen navigation={navigation} />
          </PantallaActivaContext.Provider>
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("RutasScreen — dashboard de rutas", () => {
  it("muestra el header CobraIA flotante en la esquina inferior derecha y NO en el header superior", async () => {
    const { getAllByText, getByTestId } = await renderConRutas(apiConRuta());

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
    expect(getByTestId("cobraia-flotante")).toBeTruthy();
    expect(
      within(getByTestId("cobraia-flotante")).getByText("CobraIA"),
    ).toBeTruthy();
    expect(getAllByText("CobraIA")).toHaveLength(1);
  });

  it("muestra los KPIs de la ruta: total clientes, del día, en mora y estado", async () => {
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
    const { getByTestId, getByText } = await renderConRutas(
      apiConRuta({ clientes, dia: diaConMora }),
    );

    await waitFor(() => expect(getByTestId("kpi-clientes-6")).toBeTruthy());
    expect(getByTestId("kpi-clientes-6").props.children).toBe(5);
    expect(getByTestId("kpi-dia-6").props.children).toBe(3);
    expect(getByTestId("kpi-mora-6").props.children).toBe(2);
    expect(getByText("activo")).toBeTruthy();
  });

  it("NO muestra el texto de permisos habilitados", async () => {
    const { queryByText } = await renderConRutas(apiConRuta());

    await waitFor(() =>
      expect(queryByText(/permisos habilitados/i)).toBeNull(),
    );
  });

  it("el botón Consultar fija la ruta activa y navega al tab Clientes", async () => {
    const navigate = jest.fn();
    const setRutaActiva = jest.fn();
    const { getByTestId } = await renderConRutas(
      apiConRuta(),
      navigate,
      setRutaActiva,
    );

    await waitFor(() => expect(getByTestId("consultar-6")).toBeTruthy());
    await fireEvent.press(getByTestId("consultar-6"));

    await waitFor(() =>
      expect(setRutaActiva).toHaveBeenCalledWith({
        rutaId: 6,
        rutaNombre: "Ruta Centro",
        tipoInteres: 20,
        numCuotas: 8,
        config: { rutaId: 6, periodoLiquidacion: "diario", cupoDefault: 1500 },
      }),
    );
    expect(navigate).toHaveBeenCalledWith("Clientes");
  });

  it("tocar la tarjeta abre el detalle de la ruta en el overlay", async () => {
    const abrir = jest.fn();
    const { getByTestId } = await renderConRutas(apiConRuta(), jest.fn(), jest.fn(), abrir);

    await waitFor(() => expect(getByTestId("ruta-6")).toBeTruthy());
    await fireEvent.press(getByTestId("ruta-6"));

    await waitFor(() =>
      expect(abrir).toHaveBeenCalledWith({
        tipo: "ruta",
        rutaId: 6,
        rutaNombre: "Ruta Centro",
      }),
    );
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
    };
    const navigation = { navigate: jest.fn() } as never;
    const { getByTestId } = await render(
      <OfflineContext.Provider value={offlineConPendientes}>
        <SessionContext.Provider value={valor}>
          <RutaActivaContext.Provider
            value={{ rutaActiva: null, setRutaActiva: jest.fn() }}
          >
            <PantallaActivaContext.Provider
              value={{ pantalla: null, abrir: jest.fn(), cerrar: jest.fn() }}
            >
              <RutasScreen navigation={navigation} />
            </PantallaActivaContext.Provider>
          </RutaActivaContext.Provider>
        </SessionContext.Provider>
      </OfflineContext.Provider>,
    );

    await waitFor(() => expect(getByTestId("badge-sin-subir")).toBeTruthy());
  });
});