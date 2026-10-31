jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
const SESION_ESTABLE: { token: string; role: string; permissions: Record<string, string | null> } = { token: "t", role: "master", permissions: {} };
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: SESION_ESTABLE, loading: false }),
}));

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

import { Alert, StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { CobranzaAdminScreen } from "./CobranzaAdminScreen";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

const seleccionada = (el: { props: { accessibilityState?: { selected?: boolean } } }) =>
  expect(el.props.accessibilityState?.selected).toBe(true);

describe("CobranzaAdminScreen (HU-APP-18; áreas en HU-UX-12)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/cobranza/summary") {
        return Promise.resolve({ kpis: [{ label: "Caja actual", value: "1.200.000" }] });
      }
      if (path === "/pack/cobranza/clients") {
        return Promise.resolve([
          { id: "c-1", nombre: "Juana", apellido: "Perez", telefono: null, tipo_documento: null, numero_documento: "555", negocio: null, cartera: "Cobranza Demo", cartera_id: "car-1", tope_maximo_deuda: null, color_riesgo: "blanco" },
        ]);
      }
      if (path === "/pack/cobranza/payments") {
        return Promise.resolve([{ id: "pg-1", cliente: "Juana Perez", valor: "100", metodo_pago: "efectivo", registrado_por: null, fecha_hora: "2026-10-06T10:00:00Z" }]);
      }
      if (path === "/pack/cobranza/promises") {
        return Promise.resolve([{ id: "pr-1", cliente: "Juana Perez", fecha_prometida: "2026-10-07", valor_prometido: "50", estado: "pendiente", tipo: null, creado_por: null }]);
      }
      if (path === "/pack/cobranza/devices") {
        return Promise.resolve({ pendientes: 1, dispositivos: [{ id: "d-1", codigo: "D1", gestor: "Gestor Demo", imei: "123", whatsapp: null, estado: "pendiente", vinculado: false }], intentos: [], eventos: [] });
      }
      if (path === "/pack/cobranza/portfolios") {
        return Promise.resolve([{ id: "car-1", nombre: "Cobranza Demo", descripcion: null, gestor: "Gestor Demo", gestor_id: null, tipo_interes: 10, num_cuotas: 4, moneda: "COP", estatus: "activo", costo_cobro: 0 }]);
      }
      if (path === "/pack/cobranza/reports") {
        return Promise.resolve({ filas: [{ cartera: "Cobranza Demo", clientes: 2, prestamos: 1, saldo: 600, vencidas: 0, cobrado: 100, caja: 1200, gastos: 0 }], liquidaciones: [] });
      }
      if (path === "/pack/cobranza/monitoring") {
        return Promise.resolve({ conversaciones: 1, escalaciones: 0, promesas_pendientes: 1, promesas_cumplidas: 0, promesas_incumplidas: 0, ultimas_promesas: [{ id: "pr-9", cliente: "Pedro Repetido", fecha_prometida: null, valor_prometido: "10", estado: "pendiente", tipo: null, creado_por: null }] });
      }
      if (path === "/pack/cobranza/rules") {
        return Promise.resolve({ max_dias_prorroga: 5, min_abono_pct: 10, max_reprogramaciones: 2, umbral_saldo_autonomo: 100 });
      }
      if (path === "/pack/cobranza/alerts") {
        return Promise.resolve({ total: 3, denegados: 1, items: [{ fecha: "2026-10-06T00:00:00Z", gestor: "Gestor Demo", resultado: "denegado", motivo: "dispositivo no autorizado", imei: "123", critico: true }] });
      }
      if (path === "/pack/cobranza/audit") {
        return Promise.resolve({ entidades: [], operaciones: [], filas: [{ fecha: "2026-10-06", entidad: "cuota", entidad_id: null, operacion: "editar", antes: null, despues: null, actor: null, motivo: null }] });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("muestra el resumen con los KPIs del pack", async () => {
    const { getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(getByText("1.200.000")).toBeTruthy();
  });

  it("la barra de pestañas no crece en vertical (sin hueco bajo las pestañas)", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(StyleSheet.flatten(getByTestId("cobranza-pestanas").props.style).flexGrow).toBe(0);
  });

  it("dos niveles: cinco áreas arriba y las secciones del área debajo, solo si hay más de una", async () => {
    const { getByTestId, getByText, queryByTestId, queryByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());

    for (const area of ["resumen", "carteras", "actividad", "equipo", "asistente"]) {
      expect(getByTestId(`cobranza-area-${area}`)).toBeTruthy();
    }
    seleccionada(getByTestId("cobranza-area-resumen"));
    // Resumen y Carteras tienen una sola sección visible: sin segunda fila.
    expect(queryByTestId("cobranza-secciones")).toBeNull();
    // Nada de la sección vieja «Cobros al propietario» ni 12 pastillas planas.
    expect(queryByText(/propietario/i)).toBeNull();
    expect(queryByTestId("cobranza-clientes")).toBeNull();

    await fireEvent.press(getByTestId("cobranza-area-actividad"));
    seleccionada(getByTestId("cobranza-area-actividad"));
    seleccionada(getByTestId("cobranza-pagos"));
    for (const seccion of ["pagos", "promesas", "reportes"]) {
      expect(getByTestId(`cobranza-${seccion}`)).toBeTruthy();
    }
    expect(queryByTestId("cobranza-alertas")).toBeNull();

    await fireEvent.press(getByTestId("cobranza-area-equipo"));
    for (const seccion of ["gestores", "auditoria"]) {
      expect(getByTestId(`cobranza-${seccion}`)).toBeTruthy();
    }
    // Dispositivos y Alertas de acceso son del negocio (Seguridad, ADR-0174), no de Cobranza.
    expect(queryByTestId("cobranza-dispositivos")).toBeNull();
    expect(queryByTestId("cobranza-alertas")).toBeNull();
    expect(queryByText("Alertas de acceso")).toBeNull();

    await fireEvent.press(getByTestId("cobranza-area-asistente"));
    expect(getByText("Monitoreo IA")).toBeTruthy();
    expect(getByText("Reglas de negociación")).toBeTruthy();
  });

  it("Clientes está oculta: se abre desde Carteras y se queda en el área Carteras", async () => {
    const { getByTestId, getByText, queryByTestId } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-carteras")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-carteras"));
    await waitFor(() => expect(getByTestId("cobranza-buscar-cliente")).toBeTruthy());
    expect(queryByTestId("cobranza-clientes")).toBeNull();

    await fireEvent.press(getByTestId("cobranza-buscar-cliente"));
    await waitFor(() => expect(getByText("Juana Perez")).toBeTruthy());
    seleccionada(getByTestId("cobranza-area-carteras"));
    seleccionada(getByTestId("cobranza-clientes"));
    expect(getByTestId("cobranza-carteras")).toBeTruthy();

    // Desde la ficha del cliente listado, el header lleva la cartera como padre.
    await fireEvent.press(getByText("Juana Perez"));
    expect(mockNavigate).toHaveBeenCalledWith("ClienteDetalle", {
      id: "c-1",
      titulo: "Juana Perez",
      carteraId: "car-1",
      carteraTitulo: "Cobranza Demo",
    });
  });

  it("cambia el estado de una promesa con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "cumplida")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-actividad")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-actividad"));
    await fireEvent.press(getByTestId("cobranza-promesas"));
    await waitFor(() => expect(getByText("pendiente ›")).toBeTruthy());
    await fireEvent.press(getByText("pendiente ›"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/promises/pr-1/status", {
        estado: "cumplida",
      }),
    );
    alertSpy.mockRestore();
  });

  it("lista carteras y abre su detalle", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-carteras")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-carteras"));
    await waitFor(() => expect(getByText("Cobranza Demo")).toBeTruthy());
    await fireEvent.press(getByText("activo ›"));
    expect(mockNavigate).toHaveBeenCalledWith("CarteraDetalle", { id: "car-1", titulo: "Cobranza Demo" });
  });

  it("muestra reportes con sus KPIs", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-actividad")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-actividad"));
    await fireEvent.press(getByTestId("cobranza-reportes"));
    await waitFor(() => expect(getByText("2 clientes · 1 préstamos · saldo $600")).toBeTruthy());

  });

  it("Monitoreo IA deja los contadores y manda a Promesas, sin repetir la lista", async () => {
    const { getByTestId, getByText, queryByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-asistente")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-asistente"));
    await fireEvent.press(getByTestId("cobranza-monitoreo"));
    await waitFor(() => expect(getByText("Promesas pendientes")).toBeTruthy());
    expect(queryByText("Últimas promesas")).toBeNull();
    expect(queryByText("Pedro Repetido")).toBeNull();

    await fireEvent.press(getByTestId("monitoreo-ver-promesas"));
    seleccionada(getByTestId("cobranza-area-actividad"));
    seleccionada(getByTestId("cobranza-promesas"));
    await waitFor(() => expect(getByText("pendiente ›")).toBeTruthy());
  });

  it("edita y guarda las reglas de negociación", async () => {
    const { getByTestId } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-asistente")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-asistente"));
    await fireEvent.press(getByTestId("cobranza-reglas"));
    await waitFor(() => expect(getByTestId("regla-Máx. días de prórroga")).toBeTruthy());

    await fireEvent.changeText(getByTestId("regla-Máx. días de prórroga"), "7");
    await fireEvent.press(getByTestId("reglas-guardar"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/pack/cobranza/rules", expect.objectContaining({ max_dias_prorroga: 7 })),
    );
  });

  it("muestra la auditoría del pack", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen />);
    await waitFor(() => expect(getByTestId("cobranza-area-equipo")).toBeTruthy());

    await fireEvent.press(getByTestId("cobranza-area-equipo"));
    await fireEvent.press(getByTestId("cobranza-auditoria"));
    await waitFor(() => expect(getByText("cuota · editar")).toBeTruthy());
  });

  it("abre en la pestaña pedida por el cajón o un push (la clave de la pestaña no cambia) y su área", async () => {
    const { getByTestId } = await render(<CobranzaAdminScreen pestanaInicial={{ pestana: "auditoria", n: 1 }} />);
    await waitFor(() => expect(getByTestId("cobranza-area-equipo")).toHaveStyle({ borderBottomWidth: 2 }));
    seleccionada(getByTestId("cobranza-auditoria"));
  });

  it("un push a una pestaña oculta (clientes) abre Carteras con Clientes en pantalla", async () => {
    const { getByTestId, getByText } = await render(<CobranzaAdminScreen pestanaInicial={{ pestana: "clientes", n: 1 }} />);
    await waitFor(() => expect(getByText("Juana Perez")).toBeTruthy());
    seleccionada(getByTestId("cobranza-area-carteras"));
    seleccionada(getByTestId("cobranza-clientes"));
  });

  it("ignora una pestaña pedida que el usuario no puede ver", async () => {
    const original = { ...SESION_ESTABLE };
    Object.assign(SESION_ESTABLE, { role: "owner", permissions: { "pack_cobranza:resumen": "read" } });
    try {
      const { getByTestId, queryByTestId } = await render(
        <CobranzaAdminScreen pestanaInicial={{ pestana: "auditoria", n: 1 }} />,
      );
      await waitFor(() => expect(getByTestId("cobranza-area-resumen")).toHaveStyle({ borderBottomWidth: 2 }));
      expect(queryByTestId("cobranza-area-equipo")).toBeNull();
      expect(queryByTestId("cobranza-auditoria")).toBeNull();
    } finally {
      Object.assign(SESION_ESTABLE, original);
    }
  });

  it("quien solo tiene Gestores ve Equipo sin segunda fila", async () => {
    const original = { ...SESION_ESTABLE };
    Object.assign(SESION_ESTABLE, { role: "owner", permissions: { "pack_cobranza:gestores": "read" } });
    try {
      const { getByTestId, queryByTestId } = await render(<CobranzaAdminScreen />);
      await waitFor(() => expect(getByTestId("cobranza-area-equipo")).toBeTruthy());
      seleccionada(getByTestId("cobranza-area-equipo"));
      expect(queryByTestId("cobranza-secciones")).toBeNull();
      expect(queryByTestId("cobranza-area-actividad")).toBeNull();
    } finally {
      Object.assign(SESION_ESTABLE, original);
    }
  });

  it("usa la entrada del shell (con `sub`) cuando llega por parámetros", async () => {
    const entrada = {
      id: "cobranza",
      pestanas: [
        { tab: "cobranza", pestana: "resumen", label: "Resumen", sub: "Panorama" },
        { tab: "cobranza", pestana: "pagos", label: "Pagos", sub: "Dinero" },
        { tab: "cobranza", pestana: "promesas", label: "Promesas", sub: "Dinero" },
      ],
    };
    const { getByTestId, getByText, queryByTestId } = await render(<CobranzaAdminScreen entrada={entrada} />);
    await waitFor(() => expect(getByText("Caja actual")).toBeTruthy());
    expect(getByTestId("cobranza-area-panorama")).toBeTruthy();
    await fireEvent.press(getByTestId("cobranza-area-dinero"));
    seleccionada(getByTestId("cobranza-pagos"));
    expect(queryByTestId("cobranza-area-equipo")).toBeNull();
  });
});
