import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CarteraDetalleScreen } from "./CarteraDetalleScreen";
import { SessionContext, SessionValue } from "../session/session-context";
import { CarteraActivaContext } from "../session/cartera-activa-context";
import type { GestorPermisoEstado } from "@shared/types/gestor";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("../offline/cache", () => ({
  guardarEstadisticasCartera: jest.fn().mockResolvedValue(undefined),
  leerEstadisticasCartera: jest.fn().mockResolvedValue(null),
}));

import * as cache from "../offline/cache";

const estadisticas = {
  carteraId: "6",
  fecha: "2026-09-17",
  actual: {
    totalClientes: 5,
    clientesAtrasados: 2,
    clientesVencidos: 1,
    sinVisitaHoy: 3,
    sinVisitaDesdeUltimaLiquidada: 4,
    conPrestamosNuevos: 1,
    conMasDeUnPrestamo: 0,
    clientesNuevos: 0,
  },
  anterior: {
    totalClientes: 4,
    clientesAtrasados: 3,
    clientesVencidos: 1,
    sinVisitaHoy: 1,
    sinVisitaDesdeUltimaLiquidada: 4,
    conPrestamosNuevos: 0,
    conMasDeUnPrestamo: 0,
    clientesNuevos: 0,
  },
  deltas: {
    totalClientes: 1,
    clientesAtrasados: -1,
    clientesVencidos: 0,
    sinVisitaHoy: 2,
    sinVisitaDesdeUltimaLiquidada: 0,
    conPrestamosNuevos: 1,
    conMasDeUnPrestamo: 0,
    clientesNuevos: 0,
  },
  actualizadoEn: "2026-09-17T23:55:00.000Z",
};

const trayectoDiario = {
  clientes: [
    { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde" as const },
    { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "rojo" as const },
    { clienteId: "3", nombre: "Luis", enTrayecto: false, color: "rojo" as const },
  ],
  trayectos: null,
};

const clientes = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  carteraId: "6",
  nombre: `Cliente ${i + 1}`,
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

const notas = [
  {
    id: "1",
    carteraId: "6",
    nota: "Cliente del barrio central pide más plazo.",
    creadoPorRol: "gestor",
    creadoPorId: "20",
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  },
];

function apiBase() {
  return {
    misCarteras: jest.fn().mockResolvedValue([
      {
        id: "6",
        nombre: "Cartera Centro",
        estatus: "activo",
        tipoInteres: 20,
        numCuotas: 8,
        config: { carteraId: "6" },
        permisos: [],
      },
    ]),
    listarClientesDeCartera: jest.fn().mockResolvedValue(clientes),
    trayectoDiario: jest.fn().mockResolvedValue(trayectoDiario),
    listarNotas: jest.fn().mockResolvedValue(notas),
    crearNota: jest.fn().mockResolvedValue({ id: "2", nota: "Nueva" }),
    estadisticasCartera: jest.fn().mockResolvedValue(estadisticas),
  };
}

async function renderDetalle(
  api: Partial<SessionValue["api"]> = apiBase(),
  onCerrar: jest.Mock = jest.fn(),
  permisos: GestorPermisoEstado[] = [],
) {
  const valor: SessionValue = {
    gestor: {
      id: "20",
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
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: jest.fn(),
  };
  return render(
    <SessionContext.Provider value={valor}>
      <CarteraActivaContext.Provider
        value={{
          carteraActiva: {
            carteraId: "6",
            carteraNombre: "Cartera Centro",
            tipoInteres: 20,
            numCuotas: 8,
            config: {} as never,
            permisos,
          },
          setCarteraActiva: jest.fn(),
        }}
      >
        <CarteraDetalleScreen carteraId={"6"} carteraNombre="Cartera Centro" onCerrar={onCerrar} />
      </CarteraActivaContext.Provider>
    </SessionContext.Provider>,
  );
}

function arbolDetalle(
  carteraId: string,
  carteraNombre: string,
  api: Partial<SessionValue["api"]> = apiBase(),
) {
  const valor: SessionValue = {
    gestor: { id: "20", usuario: "gestor1", nombre: "Carlos", apellido: "López", rol: "gestor" },
    loading: false,
    api: api as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: jest.fn(),
  };
  return (
    <SessionContext.Provider value={valor}>
      <CarteraActivaContext.Provider
        value={{
          carteraActiva: {
            carteraId,
            carteraNombre,
            tipoInteres: 20,
            numCuotas: 8,
            config: {} as never,
            permisos: [],
          },
          setCarteraActiva: jest.fn(),
        }}
      >
        <CarteraDetalleScreen carteraId={carteraId} carteraNombre={carteraNombre} />
      </CarteraActivaContext.Provider>
    </SessionContext.Provider>
  );
}

describe("CarteraDetalleScreen", () => {
  it("muestra el nombre, los KPIs y el estado de la cartera", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByText("Cartera Centro")).toBeTruthy());
    expect(getByTestId("kpi-total-clientes").props.children).toBe(5);
    expect(getByTestId("kpi-clientes-trayectoDiario").props.children).toBe(3);
    expect(getByTestId("kpi-en-mora").props.children).toBe(2);
    expect(getByText("Activo")).toBeTruthy();
  });

  it("el header dice 'Inicio' y no muestra botón atrás", async () => {
    const { getByText, queryByTestId } = await renderDetalle();

    await waitFor(() => expect(getByText("Inicio")).toBeTruthy());
    expect(getByText("Cartera Centro")).toBeTruthy();
    expect(queryByTestId("btn-volver")).toBeNull();
  });

  it("refresca el título del header al cambiar de cartera", async () => {
    const api = apiBase();
    const { getByText, queryByText, rerender } = await render(
      arbolDetalle("6", "Cartera Centro", api),
    );

    await waitFor(() => expect(getByText("Cartera Centro")).toBeTruthy());

    rerender(arbolDetalle("7", "Cartera Sur", api));

    await waitFor(() => expect(getByText("Cartera Sur")).toBeTruthy());
    expect(queryByText("Cartera Centro")).toBeNull();
  });

  it("al cambiar de cartera limpia los datos y muestra carga (no los de la anterior)", async () => {
    const api = apiBase() as unknown as SessionValue["api"];
    api.listarClientesDeCartera = jest.fn((id: string) =>
      id === "6"
        ? Promise.resolve(clientes)
        : new Promise(() => {
            /* nunca resuelve: simula la carga de la nueva cartera */
          }),
    ) as unknown as SessionValue["api"]["listarClientesDeCartera"];

    const { getByText, getByTestId, rerender } = await render(
      arbolDetalle("6", "Cartera Centro", api),
    );
    await waitFor(() => expect(getByText("Cartera Centro")).toBeTruthy());

    rerender(arbolDetalle("7", "Cartera Sur", api));

    await waitFor(() => expect(getByTestId("carga-spinner")).toBeTruthy());
  });

  it("lista las notas con su texto", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() =>
      expect(
        getByText("Cliente del barrio central pide más plazo."),
      ).toBeTruthy(),
    );
    expect(getByTestId("nota-item-1")).toBeTruthy();
  });

  it("'+ Nota' abre el modal y guardar llama a crearNota y refresca la lista", async () => {
    const crearNota = jest.fn().mockResolvedValue({
      id: "2",
      carteraId: "6",
      nota: "Nueva nota",
      creadoPorRol: "gestor",
      creadoPorId: "20",
      createdAt: "2026-09-02T11:00:00.000Z",
      updatedAt: "2026-09-02T11:00:00.000Z",
    });
    const listarNotas = jest
      .fn()
      .mockResolvedValueOnce(notas)
      .mockResolvedValueOnce([
        ...notas,
        {
          id: "2",
          carteraId: "6",
          nota: "Nueva nota",
          creadoPorRol: "gestor",
          creadoPorId: "20",
          createdAt: "2026-09-02T11:00:00.000Z",
          updatedAt: "2026-09-02T11:00:00.000Z",
        },
      ]);
    const { getByTestId, getByText } = await renderDetalle({
      ...apiBase(),
      crearNota,
      listarNotas,
    });

    await waitFor(() => expect(getByTestId("btn-agregar-nota")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-agregar-nota"));

    await fireEvent.changeText(getByTestId("nota-textarea"), "Nueva nota");
    await fireEvent.press(getByTestId("nota-guardar"));

    await waitFor(() => expect(crearNota).toHaveBeenCalledWith("6", "Nueva nota"));
    await waitFor(() => expect(getByText("Nueva nota")).toBeTruthy());
  });

  it("el botón Editar es de solo lectura y avisa que la edición es del panel", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByTestId("btn-editar-cartera")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cartera"));

    expect(
      getByText(/La edición de cartera se realiza desde el panel/i),
    ).toBeTruthy();
  });

  it("con permiso actualizar_cartera, Editar abre el modal y guarda nombre/interés/cuotas", async () => {
    const actualizarCartera = jest.fn().mockResolvedValue({ id: "6", nombre: "Cartera Nueva" });
    const actualizarConfiguracionCartera = jest
      .fn()
      .mockResolvedValue({ id: "6", tipoInteres: 15, numCuotas: 6 });
    const { getByTestId } = await renderDetalle(
      { ...apiBase(), actualizarCartera, actualizarConfiguracionCartera },
      jest.fn(),
      [{ permiso: "actualizar_cartera", habilitado: true }],
    );

    await waitFor(() => expect(getByTestId("btn-editar-cartera")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cartera"));
    await fireEvent.changeText(getByTestId("editar-cartera-nombre"), "Cartera Nueva");
    await fireEvent.changeText(getByTestId("editar-cartera-tipoInteres"), "15");
    await fireEvent.changeText(getByTestId("editar-cartera-numCuotas"), "6");
    await fireEvent.press(getByTestId("cartera-editar-guardar"));

    await waitFor(() => expect(actualizarCartera).toHaveBeenCalledWith("6", { nombre: "Cartera Nueva" }));
    expect(actualizarConfiguracionCartera).toHaveBeenCalledWith("6", { tipoInteres: 15, numCuotas: 6 });
  });

  it("NO muestra botón back (la navegación atrás es por gesto swipe)", async () => {
    const onCerrar = jest.fn();
    const { getByText, queryByTestId } = await renderDetalle(apiBase(), onCerrar);

    await waitFor(() => expect(getByText("Cartera Centro")).toBeTruthy());
    expect(queryByTestId("btn-back-cartera")).toBeNull();
  });

  it("NO muestra 'No se pudo guardar la nota' si la nota se creó pero el re-fetch falla", async () => {
    const crearNota = jest.fn().mockResolvedValue({ id: "2" });
    const listarNotas = jest
      .fn()
      .mockResolvedValueOnce(notas)
      .mockRejectedValueOnce(new Error("red"));
    const { getByTestId, queryByText } = await renderDetalle({
      ...apiBase(),
      crearNota,
      listarNotas,
    });

    await waitFor(() => expect(getByTestId("btn-agregar-nota")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-agregar-nota"));
    await fireEvent.changeText(getByTestId("nota-textarea"), "Nueva nota");
    await fireEvent.press(getByTestId("nota-guardar"));

    await waitFor(() => expect(crearNota).toHaveBeenCalledWith("6", "Nueva nota"));
    expect(queryByText("No se pudo guardar la nota.")).toBeNull();
  });

  it("muestra el estado 'sin cartera' y el botón para seleccionar cuando no hay cartera activa", async () => {
    const valor: SessionValue = {
      gestor: {
        id: "20",
        usuario: "gestor1",
        nombre: "Carlos",
        apellido: "López",
        rol: "gestor",
      },
      loading: false,
      api: apiBase() as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
      requiereVinculacion: false,
      marcarDispositivoVinculado: jest.fn(),
      negociosPendientes: [],
      membresiaToken: null,
      invitaciones: [],
      seleccionarNegocio: jest.fn(),
      resolverInvitacion: jest.fn(),
    };
    const { getByTestId, getByText } = await render(
      <SessionContext.Provider value={valor}>
        <CarteraActivaContext.Provider value={{ carteraActiva: null, setCarteraActiva: jest.fn() }}>
          <CarteraDetalleScreen />
        </CarteraActivaContext.Provider>
      </SessionContext.Provider>,
    );

    expect(
      getByText("Selecciona una cartera para ver su información."),
    ).toBeTruthy();
expect(getByTestId("btn-ir-seleccion")).toBeTruthy();
  });
});
describe("CarteraDetalleScreen — estadísticas", () => {
  beforeEach(() => {
    (cache.leerEstadisticasCartera as jest.Mock).mockResolvedValue(null);
  });

  it("muestra los pares actual/anterior y el delta", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByTestId("seccion-estadisticas")).toBeTruthy());
    expect(getByTestId("estadistica-clientesAtrasados").props.children).toBe(2);
    expect(getByTestId("estadistica-sinVisitaHoy").props.children).toBe(3);
    expect(getByTestId("estadistica-delta-clientesAtrasados").props.children).toBe("-1");
    expect(getByTestId("estadistica-delta-sinVisitaHoy").props.children).toBe("+2");
    expect(getByText("ayer 3")).toBeTruthy();
    expect(cache.guardarEstadisticasCartera).toHaveBeenCalledWith("6", estadisticas);
  });

  it("usa el cache con aviso cuando no hay conexión", async () => {
    (cache.leerEstadisticasCartera as jest.Mock).mockResolvedValue(estadisticas);

    const { getByTestId } = await renderDetalle({
      ...apiBase(),
      estadisticasCartera: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByTestId("aviso-offline-estadisticas")).toBeTruthy());
    expect(getByTestId("estadistica-clientesAtrasados").props.children).toBe(2);
  });

  it("no bloquea la pantalla si las estadísticas fallan", async () => {
    const { getByTestId, queryByTestId } = await renderDetalle({
      ...apiBase(),
      estadisticasCartera: jest.fn().mockRejectedValue(new Error("boom")),
    });

    await waitFor(() => expect(getByTestId("kpi-total-clientes")).toBeTruthy());
    expect(getByTestId("kpi-total-clientes").props.children).toBe(5);
    expect(queryByTestId("seccion-estadisticas")).toBeNull();
  });
});
