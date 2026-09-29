import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { TrayectoDiarioScreen } from "./TrayectoDiarioScreen";
import { ApiError } from "../api/client";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { CarteraActivaContext } from "../session/cartera-activa-context";
import type { GestorPermisoEstado } from "../types/gestor";
import { PantallaActivaProvider } from "../navigation/pantalla-activa-context";
import * as useEvidenciasModule from "../features/gastos/use-evidencias";

jest.mock("../features/navegacion/navegacion", () => ({
  abrirNavegacion: jest.fn().mockResolvedValue(undefined),
  coordenadaDeCliente: jest.fn(),
}));

jest.mock("../features/trayectoria/use-trayectoria", () => ({
  useTrayectoria: jest.fn(() => ({
    activa: false,
    puntos: [],
    error: null,
    iniciar: jest.fn(),
    detener: jest.fn().mockReturnValue([]),
  })),
}));

jest.mock("../components/TrayectosLista", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    TrayectosLista: ({
      clientes,
      trayectos,
    }: {
      clientes: Array<{ clienteId: string; nombre: string }>;
      trayectos: {
        ordenClientes: Array<
          Array<{ clienteId: string; latitud?: number; longitud?: number }>
        >;
      };
    }) =>
      React.createElement(
        View,
        { testID: "trayectos-lista" },
        ...trayectos.ordenClientes.map((trayecto, i) =>
          React.createElement(
            Text,
            { key: `t${i}` },
            `Trayecto ${i + 1}`,
          ),
        ),
        ...trayectos.ordenClientes.flatMap((trayecto, i) =>
          trayecto.map((parada, j) => {
            const nombre =
              clientes.find((c) => c.clienteId === parada.clienteId)?.nombre ??
              `Cliente ${parada.clienteId}`;
            return React.createElement(
              Text,
              { key: `p${i}-${j}` },
              `${j + 1}. ${nombre}`,
            );
          }),
        ),
      ),
  };
});

import { abrirNavegacion, coordenadaDeCliente } from "../features/navegacion/navegacion";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";

jest.mock("../offline/cache", () => ({
  guardarTrayectoDiario: jest.fn().mockResolvedValue(undefined),
  leerTrayectoDiario: jest.fn().mockResolvedValue(null),
  guardarCliente: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./ClienteScreen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    ClienteScreen: jest.fn((props: Record<string, unknown>) =>
      React.createElement(View, { testID: "mock-cliente" }),
    ),
  };
});

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((...uris: string[]) => ({
    uri: uris.join("/"),
    write: jest.fn().mockResolvedValue(undefined),
  })),
  Paths: { cache: "file:///cache" },
}));

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

import { ClienteScreen } from "./ClienteScreen";
import { OverlaysActivos } from "../navigation/OverlaysActivos";
import { TrayectosOverlayProvider } from "../navigation/trayectos-overlay-context";
import { shareAsync } from "expo-sharing";
import { File } from "expo-file-system";
import { COLORES } from "../theme/theme";
import { colorDeEstado } from "../components/ColorBadge";

const offlineValor: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  ultimaSincronizacion: null,
  versionRecarga: 0,
  eventosError: [],
  reintentarEvento: jest.fn(),
  descartarEvento: jest.fn(),
  sincronizarGeneral: jest.fn().mockResolvedValue(undefined),
  encolar: jest.fn().mockResolvedValue(undefined),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn().mockResolvedValue(undefined),
};

async function renderConApi(
  api: Partial<SessionValue["api"]>,
  offline = offlineValor,
  config: Record<string, unknown> = {},
  permisos?: GestorPermisoEstado[],
) {
  const valor: SessionValue = {
    gestor: { id: "20", usuario: "gestor1", nombre: "C", apellido: "L", rol: "gestor" },
    loading: false,
    api: {
      trayectoDiario: jest.fn().mockResolvedValue({ clientes: [], trayectos: null }),
      registrarApertura: jest.fn().mockResolvedValue({ id: "1", carteraId: "6" }),
      ...api,
    } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
  };
  return render(
    <PantallaActivaProvider>
      <TrayectosOverlayProvider>
        <OfflineContext.Provider value={offline}>
          <SessionContext.Provider value={valor}>
            <CarteraActivaContext.Provider
              value={{
                carteraActiva: {
                  carteraId: "6",
                  carteraNombre: "Cartera",
                  tipoInteres: 20,
                  numCuotas: 8,
                  config: config as never,
                  permisos,
                },
                setCarteraActiva: jest.fn(),
              }}
            >
              <TrayectoDiarioScreen />
              <OverlaysActivos />
            </CarteraActivaContext.Provider>
          </SessionContext.Provider>
        </OfflineContext.Provider>
      </TrayectosOverlayProvider>
    </PantallaActivaProvider>,
  );
}

describe("TrayectoDiarioScreen — gasto offline", () => {
  it("encola el gasto en la cola offline cuando hay error de red", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(encolar).toHaveBeenCalledWith("gasto", {
        carteraId: "6",
        descripcion: "Combustible",
        valor: 50,
        evidencias: [],
      }),
    );
  });

  it("encola el gasto con evidencias base64 cuando hay error de red", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new Error("Network request failed"));

    const spyUseEvidencias = jest
      .spyOn(useEvidenciasModule, "useEvidencias")
      .mockReturnValue({
        evidencias: [
          { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
        ],
        cargando: false,
        error: null,
        agregarDesdeLibreria: jest.fn(),
        agregarDesdeCamara: jest.fn(),
        quitar: jest.fn(),
        resetError: jest.fn(),
      });

    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(encolar).toHaveBeenCalledWith("gasto", {
        carteraId: "6",
        descripcion: "Combustible",
        valor: 50,
        evidencias: [{ nombre: "a.jpg", mimetype: "image/jpeg", base64: "AAAA" }],
      }),
    );

    spyUseEvidencias.mockRestore();
  });

  it("NO encola si el error es una respuesta HTTP válida (ApiError)", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new ApiError(400, "inválido"));
    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(getByTestId("gasto-form")).toBeTruthy(),
    );
    expect(encolar).not.toHaveBeenCalled();
  });

  it("muestra un mensaje claro si el backend rechaza por tamaño (413)", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    const registrarGasto = jest.fn().mockRejectedValue(new ApiError(413, "File too large"));
    const { getByTestId } = await renderConApi({ registrarGasto }, offlineConError);

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(getByTestId("gasto-mensaje")).toHaveTextContent(/demasiado grandes/i),
    );
    expect(encolar).not.toHaveBeenCalled();
  });
});

describe("TrayectoDiarioScreen — cache del día", () => {
  const trayectoDiario = {
    clientes: [{ clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null }],
    trayectos: null,
  };

  it("guarda el snapshot del día al cargar online", async () => {
    (cache.guardarTrayectoDiario as jest.Mock).mockResolvedValue(undefined);
    await renderConApi({ trayectoDiario: jest.fn().mockResolvedValue(trayectoDiario) });

    await waitFor(() =>
      expect(cache.guardarTrayectoDiario).toHaveBeenCalledWith("6", trayectoDiario),
    );
  });

  it("lee el cache y muestra los clientes + aviso en error de red", async () => {
    (cache.leerTrayectoDiario as jest.Mock).mockResolvedValue(trayectoDiario);
    const { getByTestId, getByText } = await renderConApi({
      trayectoDiario: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    await waitFor(() => expect(getByTestId("aviso-offline")).toBeTruthy());
  });

  it("muestra error si no hay red ni cache", async () => {
    (cache.leerTrayectoDiario as jest.Mock).mockResolvedValue(null);
    const { getByText } = await renderConApi({
      trayectoDiario: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() =>
      expect(getByText("No se pudo cargar la lista del día.")).toBeTruthy(),
    );
  });

  it("precachea tarjeta y préstamos de cada cliente del día", async () => {
    (cache.guardarTrayectoDiario as jest.Mock).mockResolvedValue(undefined);
    const clientes = [
      { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "rojo", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
    ];
    const api = {
      trayectoDiario: jest.fn().mockResolvedValue({ clientes, trayectos: null }),
      tarjeta: jest.fn().mockResolvedValue({ clienteId: "1" }),
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([]),
    };
    await renderConApi(api);

    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith("6","1", {
        tarjeta: { clienteId: "1" },
        prestamos: [],
      }),
    );
    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith("6","2", {
        tarjeta: { clienteId: "1" },
        prestamos: [],
      }),
    );
  });
});

describe("TrayectoDiarioScreen — navegación externa", () => {
  it("muestra el botón 'Cómo llegar' cuando el cliente tiene coordenadas en el trayecto", async () => {
    (coordenadaDeCliente as jest.Mock).mockReturnValue({
      latitud: -17.78,
      longitud: -63.18,
    });
    const trayectoDiario = {
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: { id: "1", carteraId: "6", fecha: "2026-09-02", ordenClientes: [], waypoints: [], distanciaEstimadaKm: 1, tiempoEstimadoMin: 1, tipo: "planificada" },
    };
    const { getByTestId } = await renderConApi({
      trayectoDiario: jest.fn().mockResolvedValue(trayectoDiario),
    });

    await waitFor(() => expect(getByTestId("llegar-1")).toBeTruthy());
    await fireEvent.press(getByTestId("llegar-1"));
    expect(abrirNavegacion).toHaveBeenCalledWith(-17.78, -63.18, "maps");
  });

  it("NO muestra el botón si el cliente no tiene coordenadas", async () => {
    (coordenadaDeCliente as jest.Mock).mockReturnValue(null);
    const trayectoDiario = {
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: null,
    };
    const { queryByTestId } = await renderConApi({
      trayectoDiario: jest.fn().mockResolvedValue(trayectoDiario),
    });

    await waitFor(() => expect(queryByTestId("cliente-1")).toBeTruthy());
    expect(queryByTestId("llegar-1")).toBeNull();
  });
});

describe("TrayectoDiarioScreen — re-fetch periódico (día en vivo)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it("recarga la lista del día automáticamente al pasar el intervalo", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [{ clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null }],
      trayectos: null,
    });
    const { getByText } = await renderConApi({ trayectoDiario });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    expect(trayectoDiario).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    await waitFor(() => expect(trayectoDiario).toHaveBeenCalledTimes(2));
  });
});

describe("TrayectoDiarioScreen — apertura de cartera", () => {
  it("registra la apertura de la cartera al montar la pantalla", async () => {
    const registrarApertura = jest.fn().mockResolvedValue({ id: "1", carteraId: "6" });
    await renderConApi({ registrarApertura });

    await waitFor(() =>
      expect(registrarApertura).toHaveBeenCalledWith("6", expect.anything()),
    );
  });
});

describe("TrayectoDiarioScreen — trayectoria offline", () => {
  it("encola la trayectoria cuando el envío falla por red", async () => {
    const encolar = jest.fn().mockResolvedValue(undefined);
    const offlineConError: OfflineValue = { ...offlineValor, encolar };
    (useTrayectoria as jest.Mock).mockReturnValue({
      activa: true,
      puntos: [
        { latitud: -17.78, longitud: -63.18 },
        { latitud: -17.79, longitud: -63.19 },
      ],
      error: null,
      iniciar: jest.fn(),
      detener: jest.fn().mockReturnValue([
        { latitud: -17.78, longitud: -63.18 },
        { latitud: -17.79, longitud: -63.19 },
      ]),
    });
    const registrarTrayectoriaReal = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const { getByTestId, getByText } = await renderConApi({ registrarTrayectoriaReal }, offlineConError);

    await waitFor(() => expect(getByTestId("detener-trayectoria")).toBeTruthy());
    await fireEvent.press(getByTestId("detener-trayectoria"));

    await waitFor(() =>
      expect(encolar).toHaveBeenCalledWith("trayectoria", {
        carteraId: "6",
        puntos: [
          { latitud: -17.78, longitud: -63.18 },
          { latitud: -17.79, longitud: -63.19 },
        ],
      }),
    );
    expect(getByText(/se sincronizará/)).toBeTruthy();
  });
});

describe("TrayectoDiarioScreen — gating de la lista del día", () => {
  it("bloquea la lista y permite generar el trayecto si no existe", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [{ clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null }],
      trayectos: null,
    });
    const generarTrayecto = jest.fn().mockResolvedValue([]);
    const { getByTestId } = await renderConApi({ trayectoDiario, generarTrayecto });

    await waitFor(() => expect(getByTestId("generar-trayecto")).toBeTruthy());
    expect(getByTestId("cliente-1").props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(getByTestId("generar-trayecto"));
    await waitFor(() => expect(generarTrayecto).toHaveBeenCalledWith("6"));
  });
});

describe("TrayectoDiarioScreen — ver trayectos generados", () => {
  it("abre la lista de trayectos desde el botón y muestra las paradas en orden", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
        { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "rojo", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: {
        id: "1",
        carteraId: "6",
        fecha: "2026-09-02",
        ordenClientes: [
          [
            { clienteId: "1", latitud: -17.78, longitud: -63.18 },
            { clienteId: "2", latitud: -17.79, longitud: -63.19 },
          ],
        ],
        waypoints: [],
        distanciaEstimadaKm: 3,
        tiempoEstimadoMin: 10,
        tipo: "planificada",
      },
    });
    const { getByTestId, getByText } = await renderConApi({ trayectoDiario });

    await waitFor(() => expect(getByTestId("ver-trayectos")).toBeTruthy());
    await fireEvent.press(getByTestId("ver-trayectos"));

    await waitFor(() => expect(getByText("Trayecto 1")).toBeTruthy());
    expect(getByText("1. Juan")).toBeTruthy();
    expect(getByText("2. Ana")).toBeTruthy();
  });

  it("la capa de trayectos se cierra con gesto swipe (handlers del responder)", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: {
        id: "1",
        carteraId: "6",
        fecha: "2026-09-02",
        ordenClientes: [[{ clienteId: "1", latitud: -17.78, longitud: -63.18 }]],
        waypoints: [],
        distanciaEstimadaKm: 1,
        tiempoEstimadoMin: 5,
        tipo: "planificada",
      },
    });
    const { getByTestId } = await renderConApi({ trayectoDiario });

    await waitFor(() => expect(getByTestId("ver-trayectos")).toBeTruthy());
    await fireEvent.press(getByTestId("ver-trayectos"));

    const capa = await waitFor(() => getByTestId("trayectos-overlay"));
    const props = capa.props as {
      onMoveShouldSetResponder?: unknown;
      onResponderRelease?: unknown;
      onResponderTerminate?: unknown;
    };
    expect(props.onMoveShouldSetResponder).toBeDefined();
    expect(props.onResponderRelease).toBeDefined();
    expect(props.onResponderTerminate).toBeDefined();
  });

  it("el back físico de Android NO lo gestiona TrayectoDiarioScreen (lo hace InicioGestor)", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: {
        id: "1",
        carteraId: "6",
        fecha: "2026-09-02",
        ordenClientes: [[{ clienteId: "1", latitud: -17.78, longitud: -63.18 }]],
        waypoints: [],
        distanciaEstimadaKm: 1,
        tiempoEstimadoMin: 5,
        tipo: "planificada",
      },
    });
    const spy = jest.spyOn(BackHandler, "addEventListener");
    const { getByTestId } = await renderConApi({ trayectoDiario });

    await waitFor(() => expect(getByTestId("ver-trayectos")).toBeTruthy());
    await fireEvent.press(getByTestId("ver-trayectos"));
    await waitFor(() => expect(getByTestId("trayectos-overlay")).toBeTruthy());

    // TrayectoDiarioScreen ya no registra handler de back; el overlay lo cierra la capa host.
    expect(
      spy.mock.calls.some(([evento]) => evento === "hardwareBackPress"),
    ).toBe(false);
  });

  it("no muestra el botón de trayectos si no hay trayecto generado", async () => {
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [{ clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null }],
      trayectos: null,
    });
    const { queryByTestId } = await renderConApi({ trayectoDiario });

    await waitFor(() => expect(queryByTestId("generar-trayecto")).toBeTruthy());
    expect(queryByTestId("ver-trayectos")).toBeNull();
  });
});

describe("TrayectoDiarioScreen — cobros del día", () => {
  it("muestra el header 'Cobros del día' con el botón '+ Gastos'", async () => {
    const { getByTestId, getByText } = await renderConApi({});

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    expect(getByText("Cobros del día")).toBeTruthy();
    expect(getByText("+ Gastos")).toBeTruthy();
  });

  it("muestra los días de mora y el compromiso de pago del día en cada cliente", async () => {
    const { getByTestId, getByText, queryByTestId } = await renderConApi({
      trayectoDiario: jest.fn().mockResolvedValue({
        clientes: [
          { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "rojo", visitaRegistrada: false, diasMora: 5, compromisoValor: null },
          { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: 300 },
        ],
        trayectos: null,
      }),
    });

    await waitFor(() => expect(getByTestId("mora-1")).toBeTruthy());
    expect(getByText("5 días de mora")).toBeTruthy();
    expect(getByTestId("compromiso-2")).toBeTruthy();
    expect(getByText("Compromiso de pago hoy: $300")).toBeTruthy();
    expect(queryByTestId("mora-2")).toBeNull();
  });

  it("muestra la barra de acento semántica según el estado del cliente", async () => {
    const { getByTestId } = await renderConApi({
      trayectoDiario: jest.fn().mockResolvedValue({
        clientes: [
          { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "rojo", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
          { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
        ],
        trayectos: null,
      }),
    });

    await waitFor(() => expect(getByTestId("acento-1")).toBeTruthy());
    expect(getByTestId("acento-1")).toHaveStyle({ backgroundColor: colorDeEstado("rojo") });
    expect(getByTestId("acento-2")).toHaveStyle({ backgroundColor: colorDeEstado("verde") });
  });

  it("'+ Gastos' abre el modal y registrarGasto guarda el gasto", async () => {
    const registrarGasto = jest.fn().mockResolvedValue({ id: "9" });
    const { getByTestId, getByText } = await renderConApi({ registrarGasto });

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));

    expect(getByText("Nuevo gasto")).toBeTruthy();
    expect(getByTestId("modal-cancelar")).toBeTruthy();
    await fireEvent.changeText(getByTestId("gasto-descripcion"), "Combustible");
    await fireEvent.changeText(getByTestId("gasto-valor"), "50");
    await fireEvent.press(getByTestId("gasto-guardar"));

    await waitFor(() =>
      expect(registrarGasto).toHaveBeenCalledWith("6",
        { descripcion: "Combustible", valor: 50 },
        [],
      ),
    );
  });

  it("muestra el error de validación del gasto en rojo (no en verde de éxito)", async () => {
    const registrarGasto = jest.fn();
    const { getByTestId, getByText } = await renderConApi({ registrarGasto });

    await waitFor(() => expect(getByTestId("nuevo-gasto")).toBeTruthy());
    await fireEvent.press(getByTestId("nuevo-gasto"));
    await fireEvent.press(getByTestId("gasto-guardar"));

    expect(
      getByText("Ingresa descripción y un valor válido."),
    ).toBeTruthy();
    expect(getByTestId("gasto-mensaje")).toHaveStyle({ color: COLORES.claro.peligro });
    expect(registrarGasto).not.toHaveBeenCalled();
  });

  it("al tocar un cliente del día abre el detalle con prestamoAutoSeleccionado", async () => {
    (useTrayectoria as jest.Mock).mockReturnValue({
      activa: true,
      puntos: [],
      error: null,
      iniciar: jest.fn(),
      detener: jest.fn().mockReturnValue([]),
    });
    const trayectoDiario = jest.fn().mockResolvedValue({
      clientes: [
        { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null },
      ],
      trayectos: {
        id: "1",
        carteraId: "6",
        fecha: "2026-09-02",
        ordenClientes: [
          [{ clienteId: "1", latitud: -17.78, longitud: -63.18 }],
        ],
        waypoints: [],
        distanciaEstimadaKm: 1,
        tiempoEstimadoMin: 1,
        tipo: "planificada",
      },
    });
    (coordenadaDeCliente as jest.Mock).mockReturnValue({
      latitud: -17.78,
      longitud: -63.18,
    });

    const valor: SessionValue = {
      gestor: { id: "20", usuario: "c1", nombre: "C", apellido: "L", rol: "gestor" },
      loading: false,
      api: {
        trayectoDiario,
        registrarApertura: jest.fn().mockResolvedValue({ id: "1", carteraId: "6" }),
      } as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
      requiereVinculacion: false,
      marcarDispositivoVinculado: jest.fn(),
    };
    const { getByTestId } = await render(
      <PantallaActivaProvider>
        <TrayectosOverlayProvider>
          <OfflineContext.Provider value={offlineValor}>
            <SessionContext.Provider value={valor}>
              <CarteraActivaContext.Provider
                value={{
                  carteraActiva: {
                    carteraId: "6",
                    carteraNombre: "Cartera",
                    tipoInteres: 20,
                    numCuotas: 8,
                    config: {} as never,
                  },
                  setCarteraActiva: jest.fn(),
                }}
              >
                <TrayectoDiarioScreen />
                <OverlaysActivos />
              </CarteraActivaContext.Provider>
            </SessionContext.Provider>
          </OfflineContext.Provider>
        </TrayectosOverlayProvider>
      </PantallaActivaProvider>,
    );

    await waitFor(() => expect(getByTestId("cliente-1")).toBeTruthy());
    await fireEvent.press(getByTestId("cliente-1"));

    await waitFor(() => expect(getByTestId("mock-cliente")).toBeTruthy());
    expect((ClienteScreen as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        carteraId: "6",
        clienteId: "1",
        prestamoAutoSeleccionado: true,
      }),
    );
  });
});

describe("TrayectoDiarioScreen — sin cartera activa", () => {
  it("NO dispara requests con carteraId=0 (trayectoDiario ni apertura) sin cartera activa", async () => {
    const trayectoDiario = jest.fn();
    const registrarApertura = jest.fn();
    const valor: SessionValue = {
      gestor: { id: "20", usuario: "c1", nombre: "C", apellido: "L", rol: "gestor" },
      loading: false,
      api: { trayectoDiario, registrarApertura } as unknown as SessionValue["api"],
      login: jest.fn(),
      logout: jest.fn(),
      actualizarPerfil: jest.fn(),
      requiereVinculacion: false,
      marcarDispositivoVinculado: jest.fn(),
    };
    await render(
      <PantallaActivaProvider>
        <TrayectosOverlayProvider>
          <OfflineContext.Provider value={offlineValor}>
            <SessionContext.Provider value={valor}>
              <CarteraActivaContext.Provider
                value={{ carteraActiva: null, setCarteraActiva: jest.fn() }}
              >
                <TrayectoDiarioScreen />
              </CarteraActivaContext.Provider>
            </SessionContext.Provider>
          </OfflineContext.Provider>
        </TrayectosOverlayProvider>
      </PantallaActivaProvider>,
    );

    expect(trayectoDiario).not.toHaveBeenCalled();
    expect(registrarApertura).not.toHaveBeenCalled();
  });
});

describe("TrayectoDiarioScreen — liquidación del día", () => {
  const clientesConVisita = [
    { clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: true, diasMora: 0, compromisoValor: null },
    { clienteId: "2", nombre: "Ana", enTrayecto: false, color: "verde", visitaRegistrada: true, diasMora: 0, compromisoValor: null },
  ];

  const hoyLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const liquidacionFixture = {
    id: "5",
    carteraId: "6",
    fecha: hoyLocal(),
    periodo: "diario",
    cajaAnterior: 1000,
    cajaActual: 1300,
    estimadoACobrar: 2000,
    totalInyeccion: 0,
    totalCobradoPeriodo: 600,
    totalCobradoDia: 600,
    totalPrestado: 0,
    totalGastos: 0,
    sumaCartera: 1400,
    comisionPorcentaje: 10,
    comisionValor: 60,
    comentario: null,
    createdAt: "2026-09-04T20:00:00Z",
    pagos: [{ id: "1", clienteId: "1", clienteNombre: "Juan", valor: 300, metodoPago: "efectivo", fechaHora: `${hoyLocal()}T14:00:00Z`, liquidado: true }],
    abonos: [{ id: "2", clienteId: "2", clienteNombre: "Ana", valor: 100, metodoPago: "efectivo", fechaHora: `${hoyLocal()}T15:00:00Z`, liquidado: true }],
  };

  it("habilita el botón solo cuando todos los clientes del día tienen visita", async () => {
    const { getByTestId } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
      },
      offlineValor,
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    expect(getByTestId("btn-liquidacion")).not.toBeDisabled();
  });

  it("bloquea el botón si algún cliente no tiene visita", async () => {
    const { getByTestId } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({
          clientes: [{ ...clientesConVisita[0], visitaRegistrada: false, diasMora: 0, compromisoValor: null }],
          trayectos: null,
        }),
      },
      offlineValor,
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    expect(getByTestId("btn-liquidacion")).toBeDisabled();
  });

  it("oculta el botón de liquidación si falta el permiso generar_reporte", async () => {
    const { queryByTestId } = await renderConApi(
      { trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }) },
      offlineValor,
      { generarReportesApk: true },
      [{ permiso: "generar_reporte", habilitado: false }],
    );

    await waitFor(() => expect(queryByTestId("cliente-1")).toBeTruthy());
    expect(queryByTestId("btn-liquidacion")).toBeNull();
  });

  it("genera la liquidación y muestra el detalle con pagos/abonos", async () => {
    const generarLiquidacion = jest.fn().mockResolvedValue(liquidacionFixture);
    const { getByTestId, getByText, getAllByText } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
        listarLiquidaciones: jest.fn().mockResolvedValue([]),
        generarLiquidacion,
      },
      offlineValor,
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-liquidacion"));
    await waitFor(() => expect(getByTestId("generar-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("generar-liquidacion"));

    await waitFor(() => expect(generarLiquidacion).toHaveBeenCalledWith("6", {}));
    expect(getByText("Pagos del día")).toBeTruthy();
    expect(getAllByText(/Juan/).length).toBeGreaterThan(0);
    expect(getByText("Abonos del día")).toBeTruthy();
    expect(getByTestId("descargar-pdf")).toBeTruthy();
  });

  it("oculta caja, estimado, cobrado y cartera según la configuración de la cartera", async () => {
    const { getByTestId, queryByText } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
        listarLiquidaciones: jest.fn().mockResolvedValue([liquidacionFixture]),
      },
      offlineValor,
      {
        generarReportesApk: true,
        mostrarCaja: false,
        mostrarCobroEstimado: false,
        mostrarCobradoLiquidada: false,
        mostrarPrestamos: false,
      },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-liquidacion"));
    await waitFor(() => expect(getByTestId("descargar-pdf")).toBeTruthy());

    expect(queryByText(/Caja anterior/)).toBeNull();
    expect(queryByText(/Caja actual/)).toBeNull();
    expect(queryByText(/Estimado a cobrar/)).toBeNull();
    expect(queryByText(/Total cobrado día/)).toBeNull();
    expect(queryByText(/Suma cartera/)).toBeNull();
  });

  it("muestra caja, estimado, cobrado y cartera por defecto", async () => {
    const { getByTestId, getByText } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
        listarLiquidaciones: jest.fn().mockResolvedValue([liquidacionFixture]),
      },
      offlineValor,
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-liquidacion"));
    await waitFor(() => expect(getByTestId("descargar-pdf")).toBeTruthy());

    expect(getByText(/Caja actual: 1300/)).toBeTruthy();
    expect(getByText(/Estimado a cobrar: 2000/)).toBeTruthy();
    expect(getByText(/Total cobrado día: 600/)).toBeTruthy();
    expect(getByText(/Suma cartera: 1400/)).toBeTruthy();
  });

  it("descarga el resumen en PDF y lo comparte", async () => {
    (File as unknown as jest.Mock).mockClear();
    (shareAsync as jest.Mock).mockClear();
    const { getByTestId } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
        listarLiquidaciones: jest.fn().mockResolvedValue([liquidacionFixture]),
        exportarLiquidacionPdf: jest.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
      },
      offlineValor,
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-liquidacion"));
    await waitFor(() => expect(getByTestId("descargar-pdf")).toBeTruthy());
    await fireEvent.press(getByTestId("descargar-pdf"));

    await waitFor(() => expect(shareAsync).toHaveBeenCalled());
    expect(File).toHaveBeenCalled();
  });

  it("deshabilita la descarga del PDF sin conexión", async () => {
    const { getByTestId } = await renderConApi(
      {
        trayectoDiario: jest.fn().mockResolvedValue({ clientes: clientesConVisita, trayectos: null }),
        listarLiquidaciones: jest.fn().mockResolvedValue([liquidacionFixture]),
      },
      { ...offlineValor, isOnline: false },
      { generarReportesApk: true },
    );

    await waitFor(() => expect(getByTestId("btn-liquidacion")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-liquidacion"));
    await waitFor(() => expect(getByTestId("descargar-pdf")).toBeTruthy());

    expect(getByTestId("descargar-pdf")).toBeDisabled();
    expect(getByTestId("pdf-requiere-conexion")).toBeTruthy();
  });
});
