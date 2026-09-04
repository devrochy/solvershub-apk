import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { RutaDetalleScreen } from "./RutaDetalleScreen";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

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
  };
}

async function renderDetalle(
  api: Partial<SessionValue["api"]> = apiBase(),
  onCerrar: jest.Mock = jest.fn(),
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
    expect(getByText("activo")).toBeTruthy();
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

  it("el botón back llama a onCerrar", async () => {
    const onCerrar = jest.fn();
    const { getByTestId } = await renderDetalle(apiBase(), onCerrar);

    await waitFor(() => expect(getByTestId("btn-back-ruta")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-back-ruta"));
    expect(onCerrar).toHaveBeenCalled();
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