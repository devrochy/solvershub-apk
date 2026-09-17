import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { RutaDetalleScreen } from "./RutaDetalleScreen";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";
import type { CobradorPermisoEstado } from "../types/cobrador";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock("../offline/cache", () => ({
  guardarEstadisticasRuta: jest.fn().mockResolvedValue(undefined),
  leerEstadisticasRuta: jest.fn().mockResolvedValue(null),
}));

import * as cache from "../offline/cache";

const estadisticas = {
  rutaId: 6,
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

const dia = {
  clientes: [
    { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const },
    { clienteId: 2, nombre: "Ana", enTrayecto: false, color: "rojo" as const },
    { clienteId: 3, nombre: "Luis", enTrayecto: false, color: "rojo" as const },
  ],
  trayectos: null,
};

const clientes = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  rutaId: 6,
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
    id: 1,
    rutaId: 6,
    nota: "Cliente del barrio central pide más plazo.",
    creadoPorRol: "cobrador",
    creadoPorId: 20,
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  },
];

function apiBase() {
  return {
    misRutas: jest.fn().mockResolvedValue([
      {
        id: 6,
        nombre: "Ruta Centro",
        estatus: "activo",
        tipoInteres: 20,
        numCuotas: 8,
        config: { rutaId: 6 },
        permisos: [],
      },
    ]),
    listarClientesDeRuta: jest.fn().mockResolvedValue(clientes),
    dia: jest.fn().mockResolvedValue(dia),
    listarNotas: jest.fn().mockResolvedValue(notas),
    crearNota: jest.fn().mockResolvedValue({ id: 2, nota: "Nueva" }),
    estadisticasRuta: jest.fn().mockResolvedValue(estadisticas),
  };
}

async function renderDetalle(
  api: Partial<SessionValue["api"]> = apiBase(),
  onCerrar: jest.Mock = jest.fn(),
  permisos: CobradorPermisoEstado[] = [],
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
    <SessionContext.Provider value={valor}>
      <RutaActivaContext.Provider
        value={{
          rutaActiva: {
            rutaId: 6,
            rutaNombre: "Ruta Centro",
            tipoInteres: 20,
            numCuotas: 8,
            config: {} as never,
            permisos,
          },
          setRutaActiva: jest.fn(),
        }}
      >
        <RutaDetalleScreen rutaId={6} rutaNombre="Ruta Centro" onCerrar={onCerrar} />
      </RutaActivaContext.Provider>
    </SessionContext.Provider>,
  );
}

describe("RutaDetalleScreen", () => {
  it("muestra el nombre, los KPIs y el estado de la ruta", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByText("Ruta Centro")).toBeTruthy());
    expect(getByTestId("kpi-total-clientes").props.children).toBe(5);
    expect(getByTestId("kpi-clientes-dia").props.children).toBe(3);
    expect(getByTestId("kpi-en-mora").props.children).toBe(2);
    expect(getByText("Activo")).toBeTruthy();
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
      id: 2,
      rutaId: 6,
      nota: "Nueva nota",
      creadoPorRol: "cobrador",
      creadoPorId: 20,
      createdAt: "2026-09-02T11:00:00.000Z",
      updatedAt: "2026-09-02T11:00:00.000Z",
    });
    const listarNotas = jest
      .fn()
      .mockResolvedValueOnce(notas)
      .mockResolvedValueOnce([
        ...notas,
        {
          id: 2,
          rutaId: 6,
          nota: "Nueva nota",
          creadoPorRol: "cobrador",
          creadoPorId: 20,
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

    await waitFor(() => expect(crearNota).toHaveBeenCalledWith(6, "Nueva nota"));
    await waitFor(() => expect(getByText("Nueva nota")).toBeTruthy());
  });

  it("el botón Editar es de solo lectura y avisa que la edición es del panel", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByTestId("btn-editar-ruta")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-ruta"));

    expect(
      getByText(/La edición de ruta se realiza desde el panel/i),
    ).toBeTruthy();
  });

  it("con permiso actualizar_ruta, Editar abre el modal y guarda nombre/interés/cuotas", async () => {
    const actualizarRuta = jest.fn().mockResolvedValue({ id: 6, nombre: "Ruta Nueva" });
    const actualizarConfiguracionRuta = jest
      .fn()
      .mockResolvedValue({ id: 6, tipoInteres: 15, numCuotas: 6 });
    const { getByTestId } = await renderDetalle(
      { ...apiBase(), actualizarRuta, actualizarConfiguracionRuta },
      jest.fn(),
      [{ permiso: "actualizar_ruta", habilitado: true }],
    );

    await waitFor(() => expect(getByTestId("btn-editar-ruta")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-ruta"));
    await fireEvent.changeText(getByTestId("editar-ruta-nombre"), "Ruta Nueva");
    await fireEvent.changeText(getByTestId("editar-ruta-tipoInteres"), "15");
    await fireEvent.changeText(getByTestId("editar-ruta-numCuotas"), "6");
    await fireEvent.press(getByTestId("ruta-editar-guardar"));

    await waitFor(() => expect(actualizarRuta).toHaveBeenCalledWith(6, { nombre: "Ruta Nueva" }));
    expect(actualizarConfiguracionRuta).toHaveBeenCalledWith(6, { tipoInteres: 15, numCuotas: 6 });
  });

  it("NO muestra botón back (la navegación atrás es por gesto swipe)", async () => {
    const onCerrar = jest.fn();
    const { getByText, queryByTestId } = await renderDetalle(apiBase(), onCerrar);

    await waitFor(() => expect(getByText("Ruta Centro")).toBeTruthy());
    expect(queryByTestId("btn-back-ruta")).toBeNull();
  });

  it("NO muestra 'No se pudo guardar la nota' si la nota se creó pero el re-fetch falla", async () => {
    const crearNota = jest.fn().mockResolvedValue({ id: 2 });
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

    await waitFor(() => expect(crearNota).toHaveBeenCalledWith(6, "Nueva nota"));
    expect(queryByText("No se pudo guardar la nota.")).toBeNull();
  });

  it("muestra el estado 'sin ruta' y el botón para seleccionar cuando no hay ruta activa", async () => {
    const valor: SessionValue = {
      cobrador: {
        id: 20,
        usuario: "cobrador1",
        nombre: "Carlos",
        apellido: "López",
        rol: "cobrador",
      },
      loading: false,
      api: apiBase() as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
    };
    const { getByTestId, getByText } = await render(
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider value={{ rutaActiva: null, setRutaActiva: jest.fn() }}>
          <RutaDetalleScreen />
        </RutaActivaContext.Provider>
      </SessionContext.Provider>,
    );

    expect(
      getByText("Selecciona una ruta para ver su información."),
    ).toBeTruthy();
expect(getByTestId("btn-ir-seleccion")).toBeTruthy();
  });
});
describe("RutaDetalleScreen — estadísticas", () => {
  beforeEach(() => {
    (cache.leerEstadisticasRuta as jest.Mock).mockResolvedValue(null);
  });

  it("muestra los pares actual/anterior y el delta", async () => {
    const { getByTestId, getByText } = await renderDetalle();

    await waitFor(() => expect(getByTestId("seccion-estadisticas")).toBeTruthy());
    expect(getByTestId("estadistica-clientesAtrasados").props.children).toBe(2);
    expect(getByTestId("estadistica-sinVisitaHoy").props.children).toBe(3);
    expect(getByTestId("estadistica-delta-clientesAtrasados").props.children).toBe("-1");
    expect(getByTestId("estadistica-delta-sinVisitaHoy").props.children).toBe("+2");
    expect(getByText("ayer 3")).toBeTruthy();
    expect(cache.guardarEstadisticasRuta).toHaveBeenCalledWith(6, estadisticas);
  });

  it("usa el cache con aviso cuando no hay conexión", async () => {
    (cache.leerEstadisticasRuta as jest.Mock).mockResolvedValue(estadisticas);

    const { getByTestId } = await renderDetalle({
      ...apiBase(),
      estadisticasRuta: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByTestId("aviso-offline-estadisticas")).toBeTruthy());
    expect(getByTestId("estadistica-clientesAtrasados").props.children).toBe(2);
  });

  it("no bloquea la pantalla si las estadísticas fallan", async () => {
    const { getByTestId, queryByTestId } = await renderDetalle({
      ...apiBase(),
      estadisticasRuta: jest.fn().mockRejectedValue(new Error("boom")),
    });

    await waitFor(() => expect(getByTestId("kpi-total-clientes")).toBeTruthy());
    expect(getByTestId("kpi-total-clientes").props.children).toBe(5);
    expect(queryByTestId("seccion-estadisticas")).toBeNull();
  });
});
