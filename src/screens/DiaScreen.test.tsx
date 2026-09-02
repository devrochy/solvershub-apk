import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { DiaScreen } from "./DiaScreen";
import { ApiError } from "../api/client";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
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

import { abrirNavegacion, coordenadaDeCliente } from "../features/navegacion/navegacion";
import { useTrayectoria } from "../features/trayectoria/use-trayectoria";

jest.mock("../offline/cache", () => ({
  guardarDia: jest.fn().mockResolvedValue(undefined),
  leerDia: jest.fn().mockResolvedValue(null),
  guardarCliente: jest.fn().mockResolvedValue(undefined),
}));

const offlineValor: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  encolar: jest.fn().mockResolvedValue(undefined),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn().mockResolvedValue(undefined),
};

async function renderConApi(
  api: Partial<SessionValue["api"]>,
  offline = offlineValor,
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "C", apellido: "L" },
    loading: false,
    api: { dia: jest.fn().mockResolvedValue({ clientes: [], trayectos: null }), ...api } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate: jest.fn() } as never;
  return render(
    <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <DiaScreen
          navigation={navigation}
          route={{ key: "dia", name: "Dia", params: { rutaId: 6, rutaNombre: "Ruta" } }}
        />
      </SessionContext.Provider>
    </OfflineContext.Provider>,
  );
}

describe("DiaScreen — gasto offline", () => {
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
});

describe("DiaScreen — cache del día", () => {
  const dia = {
    clientes: [{ clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const }],
    trayectos: null,
  };

  it("guarda el snapshot del día al cargar online", async () => {
    (cache.guardarDia as jest.Mock).mockResolvedValue(undefined);
    await renderConApi({ dia: jest.fn().mockResolvedValue(dia) });

    await waitFor(() =>
      expect(cache.guardarDia).toHaveBeenCalledWith(6, dia),
    );
  });

  it("lee el cache y muestra los clientes + aviso en error de red", async () => {
    (cache.leerDia as jest.Mock).mockResolvedValue(dia);
    const { getByTestId, getByText } = await renderConApi({
      dia: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    await waitFor(() => expect(getByTestId("aviso-offline")).toBeTruthy());
  });

  it("muestra error si no hay red ni cache", async () => {
    (cache.leerDia as jest.Mock).mockResolvedValue(null);
    const { getByText } = await renderConApi({
      dia: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() =>
      expect(getByText("No se pudo cargar la lista del día.")).toBeTruthy(),
    );
  });

  it("precachea tarjeta y préstamos de cada cliente del día", async () => {
    (cache.guardarDia as jest.Mock).mockResolvedValue(undefined);
    const clientes = [
      { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const },
      { clienteId: 2, nombre: "Ana", enTrayecto: false, color: "rojo" as const },
    ];
    const api = {
      dia: jest.fn().mockResolvedValue({ clientes, trayectos: null }),
      tarjeta: jest.fn().mockResolvedValue({ clienteId: 1 }),
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([]),
    };
    await renderConApi(api);

    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith(6, 1, {
        tarjeta: { clienteId: 1 },
        prestamos: [],
      }),
    );
    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith(6, 2, {
        tarjeta: { clienteId: 1 },
        prestamos: [],
      }),
    );
  });
});

describe("DiaScreen — navegación externa", () => {
  it("muestra el botón 'Cómo llegar' cuando el cliente tiene coordenadas en el trayecto", async () => {
    (coordenadaDeCliente as jest.Mock).mockReturnValue({
      latitud: -17.78,
      longitud: -63.18,
    });
    const dia = {
      clientes: [
        { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const },
      ],
      trayectos: { id: 1, rutaId: 6, fecha: "2026-09-02", ordenClientes: [], waypoints: [], distanciaEstimadaKm: 1, tiempoEstimadoMin: 1, tipo: "planificada" },
    };
    const { getByTestId } = await renderConApi({
      dia: jest.fn().mockResolvedValue(dia),
    });

    await waitFor(() => expect(getByTestId("llegar-1")).toBeTruthy());
    await fireEvent.press(getByTestId("llegar-1"));
    expect(abrirNavegacion).toHaveBeenCalledWith(-17.78, -63.18, "maps");
  });

  it("NO muestra el botón si el cliente no tiene coordenadas", async () => {
    (coordenadaDeCliente as jest.Mock).mockReturnValue(null);
    const dia = {
      clientes: [
        { clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const },
      ],
      trayectos: null,
    };
    const { queryByTestId } = await renderConApi({
      dia: jest.fn().mockResolvedValue(dia),
    });

    await waitFor(() => expect(queryByTestId("cliente-1")).toBeTruthy());
    expect(queryByTestId("llegar-1")).toBeNull();
  });
});

describe("DiaScreen — re-fetch periódico (día en vivo)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  it("recarga la lista del día automáticamente al pasar el intervalo", async () => {
    const dia = jest.fn().mockResolvedValue({
      clientes: [{ clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" as const }],
      trayectos: null,
    });
    const { getByText } = await renderConApi({ dia });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    expect(dia).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    await waitFor(() => expect(dia).toHaveBeenCalledTimes(2));
  });
});

describe("DiaScreen — trayectoria offline", () => {
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
        puntos: [
          { latitud: -17.78, longitud: -63.18 },
          { latitud: -17.79, longitud: -63.19 },
        ],
      }),
    );
    expect(getByText(/se sincronizará/)).toBeTruthy();
  });
});