import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ClienteScreen } from "./ClienteScreen";
import * as cache from "../offline/cache";
import { OfflineContext, OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";
import { RutaActivaContext } from "../session/ruta-activa-context";
import { PantallaActivaProvider } from "../navigation/pantalla-activa-context";
import type { EstadoCuentaPrestamoPublic, PrestamoPublic } from "../types/cobrador";

jest.mock("../features/estado-cuenta/estado-cuenta", () => ({
  enlaceWhatsApp: jest.fn(
    (telefono: string, texto: string) =>
      `https://wa.me/${telefono.replace(/[^\d]/g, "")}?text=${encodeURIComponent(texto)}`,
  ),
  textoReportePrestamo: jest.fn(() => "Estado de cuenta de Juan"),
  numeroWhatsApp: jest.fn((t: string) => t.replace(/[^\d]/g, "")),
}));

jest.mock("react-native-view-shot", () => ({
  captureRef: jest.fn().mockRejectedValue(new Error("captura no disponible")),
}));

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///tmp/foto.jpg", fileName: "foto.jpg", mimeType: "image/jpeg" },
    ],
  }),
  launchCameraAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: "file:///tmp/camara.jpg", fileName: "camara.jpg", mimeType: "image/jpeg" },
    ],
  }),
}));

import { Linking } from "react-native";
import { captureRef } from "react-native-view-shot";
import { shareAsync } from "expo-sharing";
import { enlaceWhatsApp } from "../features/estado-cuenta/estado-cuenta";
import { abrirNavegacion } from "../features/navegacion/navegacion";

jest.mock("../offline/cache", () => ({
  guardarCliente: jest.fn().mockResolvedValue(undefined),
  leerCliente: jest.fn().mockResolvedValue(null),
}));

jest.mock("../features/navegacion/navegacion", () => ({
  abrirNavegacion: jest.fn().mockResolvedValue(undefined),
}));

const offlineValor: OfflineValue = {
  isOnline: true,
  sinSubir: 0,
  errorSync: null,
  encolar: jest.fn().mockResolvedValue(undefined),
  encolarSiNoExiste: jest.fn().mockResolvedValue(true),
  sincronizar: jest.fn().mockResolvedValue(undefined),
};

const prestamo = {
  id: 1,
  rutaId: 6,
  clienteId: 2,
  valor: 1000,
  numCuotas: 4,
  tipoInteres: 20,
  diasEntreCuotas: 7,
  fechaOtorgado: "2026-08-01",
  estatus: "vigente" as const,
  cuotas: [
    {
      id: 10,
      numeroCuota: 1,
      valorEsperado: 300,
      fechaVencimiento: "2026-08-08",
      estatus: "pendiente" as const,
    },
  ],
};

const tarjeta = {
  clienteId: 2,
  rutaId: 6,
  nombre: "Juan",
  negocio: null,
  telefonoWhatsapp: "+59170000000",
  color: "azul" as const,
  fotoUrl: null,
  tipoPago: null,
  saldoPendiente: 300,
  diasMora: 0,
};

function estadoCuentaDe(p: PrestamoPublic): EstadoCuentaPrestamoPublic {
  return {
    prestamoId: p.id,
    rutaId: p.rutaId,
    clienteId: p.clienteId,
    nombreCliente: "Juan",
    valor: p.valor,
    numCuotas: p.numCuotas,
    tipoInteres: p.tipoInteres,
    estatus: p.estatus,
    moneda: "Bs",
    cuotas: p.cuotas.map((c) => ({
      cuotaId: c.id,
      numeroCuota: c.numeroCuota,
      valorEsperado: c.valorEsperado,
      fechaVencimiento: c.fechaVencimiento,
      estatus: c.estatus,
      abonosAcumulados: c.estatus === "pagada" ? c.valorEsperado : 0,
      saldoPendiente: c.estatus === "pagada" ? 0 : c.valorEsperado,
    })),
    totalAbonos: 0,
    saldoPendiente: 300,
    proximoVencimiento: "2026-08-08",
  };
}

type ParametrosDetalle = {
  latitud?: number;
  longitud?: number;
  prestamoAutoSeleccionado?: boolean;
};

async function renderConApi(
  api: Partial<SessionValue["api"]>,
  offline = offlineValor,
  params: ParametrosDetalle = {},
  navigate: jest.Mock = jest.fn(),
) {
  const valor: SessionValue = {
    cobrador: { id: 20, usuario: "cobrador1", nombre: "C", apellido: "L", rol: "cobrador" },
    loading: false,
    api: {
      tarjeta: jest.fn().mockResolvedValue(tarjeta),
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamo]),
      obtenerEstadoCuentaPrestamo: jest.fn().mockResolvedValue(estadoCuentaDe(prestamo)),
      ...api,
    } as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
  };
  const navigation = { navigate } as never;
  return render(
    <PantallaActivaProvider>
      <OfflineContext.Provider value={offline}>
      <SessionContext.Provider value={valor}>
        <RutaActivaContext.Provider
          value={{
            rutaActiva: {
              rutaId: 6,
              rutaNombre: "Ruta Centro",
              tipoInteres: 20,
              numCuotas: 8,
              config: { rutaId: 6, cupoDefault: 1500, cuotasMinimasPrestamo: 1 } as never,
            },
            setRutaActiva: jest.fn(),
          }}
        >
          <ClienteScreen
            navigation={navigation}
            route={{
              key: "cliente",
              name: "Cliente",
              params: { rutaId: 6, clienteId: 2, nombre: "Juan", ...params },
            }}
          />
        </RutaActivaContext.Provider>
      </SessionContext.Provider>
      </OfflineContext.Provider>
    </PantallaActivaProvider>,
  );
}

describe("ClienteScreen — modales de pago/no pago", () => {
  it("registra un abono parcial con tipoPago abono sin cuotaId", async () => {
    const registrarVisitaPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId } = await renderConApi(
      { registrarVisitaPago },
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.press(getByTestId("tipo-abono"));
    await fireEvent.changeText(getByTestId("pago-valor"), "100");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "pago",
        tipoPago: "abono",
        cuotaId: undefined,
        valor: 100,
        metodoPago: "efectivo",
      }),
    );
  });

  it("registra una visita no-pago con promesa de pago (compromiso_de_pago)", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText } = await renderConApi(
      { registrarVisitaNoPago },
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await fireEvent.changeText(getByTestId("fecha-prometida"), manana);
    await fireEvent.changeText(getByTestId("valor-prometido"), "150");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(registrarVisitaNoPago).toHaveBeenCalledWith(6, {
        prestamoId: 1,
        clienteId: 2,
        resultado: "no_pago",
        motivoNoPago: "compromiso_de_pago",
        fechaPrometida: manana,
        valorPrometido: 150,
      }),
    );
  });

  it("exige fecha prometida para compromiso de pago", async () => {
    const registrarVisitaNoPago = jest.fn().mockResolvedValue({ id: 1 });
    const { getByTestId, getByText } = await renderConApi(
      { registrarVisitaNoPago },
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByText("compromiso_de_pago"));
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(
        getByText("Para compromiso de pago se requiere la fecha prometida."),
      ).toBeTruthy(),
    );
    expect(registrarVisitaNoPago).not.toHaveBeenCalled();
  });

  it("encola la visita en la cola offline cuando hay error de red", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        {
          prestamoId: 1,
          clienteId: 2,
          resultado: "pago",
          tipoPago: "cuota",
          cuotaId: 10,
          valor: 300,
          metodoPago: "efectivo",
        },
        "pago-1-2-10",
      ),
    );
  });

  it("no encola un pago duplicado pendiente (dedupe) y avisa", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(false);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId, getByText } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(
        getByText("Ya hay un pago pendiente por sincronizar para este préstamo."),
      ).toBeTruthy(),
    );
  });

  it("dedup de abono usa la clave abono (no colisiona con pagos de cuota)", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const registrarVisitaPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaPago },
      offlineConError,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.press(getByTestId("tipo-abono"));
    await fireEvent.changeText(getByTestId("pago-valor"), "100");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        expect.objectContaining({ tipoPago: "abono", cuotaId: undefined }),
        "pago-1-2-abono",
      ),
    );
  });

  it("dedup de no_pago usa la clave préstamo-cliente", async () => {
    const errorRed = new Error("Network request failed");
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const registrarVisitaNoPago = jest.fn().mockRejectedValue(errorRed);
    const { getByTestId } = await renderConApi(
      { registrarVisitaNoPago },
      offlineConError,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-no-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-no-pago"));
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "visita",
        expect.objectContaining({ resultado: "no_pago", motivoNoPago: "no_esta" }),
        "no_pago-1-2",
      ),
    );
  });

  it("no permite pagar una cuota si el préstamo no tiene cuotas pendientes", async () => {
    const prestamoPagado = {
      ...prestamo,
      cuotas: [{ ...prestamo.cuotas[0], estatus: "pagada" as const }],
    };
    const registrarVisitaPago = jest.fn();
    const { getByTestId, getByText } = await renderConApi(
      {
        listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamoPagado]),
        obtenerEstadoCuentaPrestamo: jest
          .fn()
          .mockResolvedValue(estadoCuentaDe(prestamoPagado)),
        registrarVisitaPago,
      },
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-pago"));
    await fireEvent.changeText(getByTestId("pago-valor"), "300");
    await fireEvent.press(getByTestId("guardar-visita"));

    await waitFor(() =>
      expect(
        getByText("Sin cuotas pendientes para este préstamo."),
      ).toBeTruthy(),
    );
    expect(registrarVisitaPago).not.toHaveBeenCalled();
  });
});

describe("ClienteScreen — cache offline", () => {
  it("guarda tarjeta + prestamos al cargar online", async () => {
    (cache.guardarCliente as jest.Mock).mockResolvedValue(undefined);
    await renderConApi({});

    await waitFor(() =>
      expect(cache.guardarCliente).toHaveBeenCalledWith(6, 2, {
        tarjeta,
        prestamos: [prestamo],
      }),
    );
  });

  it("lee el cache y muestra la tarjeta en error de red", async () => {
    (cache.leerCliente as jest.Mock).mockResolvedValue({ tarjeta, prestamos: [prestamo] });
    const { getByText } = await renderConApi({
      tarjeta: jest.fn().mockRejectedValue(new Error("Network request failed")),
      listarPrestamosDeCliente: jest.fn().mockRejectedValue(new Error("Network request failed")),
    });

    await waitFor(() => expect(getByText("Juan")).toBeTruthy());
    expect(getByText(/Saldo pendiente: 300/)).toBeTruthy();
  });
});

describe("ClienteScreen — edición de cliente en modal (offline)", () => {
  it("el enlace Editar del header abre el modal y guarda cambios encolando cambio_cliente", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId, getByText } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));

    expect(getByText("Editar cliente")).toBeTruthy();
    expect(getByTestId("editar-cliente-form")).toBeTruthy();
    await fireEvent.changeText(getByTestId("editar-nombre"), "Juan Carlos");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "cambio_cliente",
        { clienteId: 2, input: { nombre: "Juan Carlos" } },
        "cambio_cliente-2",
      ),
    );
    expect(getByText(/se sincronizará/)).toBeTruthy();
  });

  it("editar lat/lng desde el mapa del modal sincroniza los campos y encola el cambio", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));

    await fireEvent(
      getByTestId("mapa-pin-negocio-webview"),
      "message",
      { nativeEvent: { data: JSON.stringify({ latitud: -17.79, longitud: -63.19 }) } },
    );

    expect(getByTestId("editar-latitud").props.value).toBe("-17.79");
    expect(getByTestId("editar-longitud").props.value).toBe("-63.19");

    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "cambio_cliente",
        expect.objectContaining({
          input: expect.objectContaining({ latitud: -17.79, longitud: -63.19 }),
        }),
        "cambio_cliente-2",
      ),
    );
  });

  it("tras editar el teléfono, el WhatsApp usa el número nuevo (no stale)", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByTestId } = await renderConApi(
      {},
      offlineConError,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.changeText(getByTestId("editar-telefono"), "+59179999999");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp"));

    expect(enlaceWhatsApp).toHaveBeenCalledWith("+59179999999", "Estado de cuenta de Juan");
  });

  it("no vuelve a encolar si ya hay un cambio pendiente del cliente", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(false);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId, getByText } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.changeText(getByTestId("editar-nombre"), "Otro");
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    await waitFor(() =>
      expect(encolarSiNoExiste).toHaveBeenCalledWith(
        "cambio_cliente",
        { clienteId: 2, input: { nombre: "Otro" } },
        "cambio_cliente-2",
      ),
    );
    expect(getByText("Ya hay un cambio pendiente por sincronizar.")).toBeTruthy();
  });

  it("no encola si no cambió ningún campo", async () => {
    const encolarSiNoExiste = jest.fn().mockResolvedValue(true);
    const offlineConError: OfflineValue = { ...offlineValor, encolarSiNoExiste };
    const { getByTestId, getByText } = await renderConApi({}, offlineConError);

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-editar-cliente"));
    await fireEvent.press(getByTestId("guardar-cambio-cliente"));

    expect(encolarSiNoExiste).not.toHaveBeenCalled();
    // El error de validación se muestra DENTRO del modal (visible al usuario),
    // no solo en el banner global detrás del backdrop.
    expect(getByTestId("mensaje-editar")).toHaveTextContent(
      "No hay cambios para guardar.",
    );
    expect(getByTestId("editar-cliente-form")).toBeTruthy();
  });
});

describe("ClienteScreen — navegación externa (maps/waze)", () => {
  it("despliega el mapa y los botones de navegación desde Cómo llegar con coordenadas", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("btn-como-llegar")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-como-llegar"));

    expect(getByTestId("navegar-maps")).toBeTruthy();
    expect(getByTestId("navegar-waze")).toBeTruthy();
    expect(getByTestId("mapa-cliente")).toBeTruthy();
  });

  it("no muestra el botón Cómo llegar ni el mapa sin coordenadas", async () => {
    const { queryByTestId } = await renderConApi({});

    await waitFor(() => expect(queryByTestId("prestamo-item-1")).toBeTruthy());
    expect(queryByTestId("btn-como-llegar")).toBeNull();
    expect(queryByTestId("navegar-maps")).toBeNull();
    expect(queryByTestId("mapa-cliente")).toBeNull();
  });

  it("abre Waze al tocar el botón Waze", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("btn-como-llegar")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-como-llegar"));
    await fireEvent.press(getByTestId("navegar-waze"));

    expect(abrirNavegacion).toHaveBeenCalledWith(-17.78, -63.18, "waze");
  });

  it("abre Google Maps al tocar el botón Maps", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { latitud: -17.78, longitud: -63.18 },
    );

    await waitFor(() => expect(getByTestId("btn-como-llegar")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-como-llegar"));
    await fireEvent.press(getByTestId("navegar-maps"));

    expect(abrirNavegacion).toHaveBeenCalledWith(-17.78, -63.18, "maps");
  });
});

describe("ClienteScreen — notificación de próximo cobro", () => {
  it("muestra la suma de las próximas cuotas pendientes de los préstamos activos", async () => {
    const { getByTestId, getByText } = await renderConApi({});

    await waitFor(() => expect(getByTestId("notif-proximo-cobro")).toBeTruthy());
    expect(getByText("Próximo cobro")).toBeTruthy();
    expect(getByText(/300.*1 préstamo/)).toBeTruthy();
  });

  it("oculta la notificación si no hay cuotas pendientes", async () => {
    const prestamoPagado = {
      ...prestamo,
      cuotas: [{ ...prestamo.cuotas[0], estatus: "pagada" as const }],
    };
    const { queryByTestId } = await renderConApi({
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamoPagado]),
    });

    await waitFor(() => expect(queryByTestId("prestamo-item-1")).toBeTruthy());
    expect(queryByTestId("notif-proximo-cobro")).toBeNull();
  });
});

describe("ClienteScreen — WhatsApp con screenshot del detalle", () => {
  beforeEach(() => {
    (captureRef as jest.Mock).mockClear();
    (shareAsync as jest.Mock).mockClear();
  });

  it("captura un screenshot de la tarjeta del préstamo y lo comparte", async () => {
    (captureRef as jest.Mock).mockResolvedValueOnce("file:///tmp/detalle.png");
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp"));

    await waitFor(() => expect(captureRef).toHaveBeenCalled());
    expect(shareAsync).toHaveBeenCalledWith(
      "file:///tmp/detalle.png",
      expect.objectContaining({ mimeType: "image/png" }),
    );
  });

  it("cae al enlace wa.me si no se puede capturar el screenshot", async () => {
    (captureRef as jest.Mock).mockRejectedValueOnce(new Error("captura falló"));
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-whatsapp")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-whatsapp"));

    await waitFor(() =>
      expect(enlaceWhatsApp).toHaveBeenCalledWith(
        "+59170000000",
        "Estado de cuenta de Juan",
      ),
    );
    expect(Linking.openURL).toHaveBeenCalled();
  });

  it("muestra el canvas de cuotas del préstamo seleccionado junto al botón WhatsApp", async () => {
    const { getByTestId } = await renderConApi(
      {},
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("cuota-1")).toBeTruthy());
    expect(getByTestId("btn-whatsapp")).toBeTruthy();
    expect(getByTestId("detalle-prestamo")).toBeTruthy();
  });
});

describe("ClienteScreen — tarjeta principal, avatar y documento", () => {
  it("muestra la foto, el tipo de pago y el teléfono cuando vienen en la tarjeta", async () => {
    const tarjetaCompleta = {
      ...tarjeta,
      fotoUrl: "https://cdn.test/foto.jpg",
      tipoPago: "diario",
    };
    const { getByTestId, getByText } = await renderConApi({
      tarjeta: jest.fn().mockResolvedValue(tarjetaCompleta),
    });

    await waitFor(() => expect(getByTestId("avatar-foto")).toBeTruthy());
    expect(getByText(/Tipo de pago: diario/)).toBeTruthy();
    expect(getByText(/WhatsApp: \+59170000000/)).toBeTruthy();
  });

  it("usa el icono person cuando no hay foto y no muestra el tipo de pago", async () => {
    const { queryByTestId, queryByText } = await renderConApi({});

    await waitFor(() => expect(queryByTestId("avatar-icono")).toBeTruthy());
    expect(queryByTestId("avatar-foto")).toBeNull();
    expect(queryByText(/Tipo de pago:/)).toBeNull();
  });

  it("el avatar abre un modal con opciones y sube la foto por evidencias", async () => {
    const agregarEvidenciasCliente = jest.fn().mockResolvedValue({ clienteId: 2 });
    const { getByTestId } = await renderConApi({ agregarEvidenciasCliente });

    await waitFor(() => expect(getByTestId("btn-avatar")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-avatar"));

    expect(getByTestId("avatar-modal")).toBeTruthy();
    await fireEvent.press(getByTestId("avatar-libreria"));

    await waitFor(() =>
      expect(agregarEvidenciasCliente).toHaveBeenCalledWith(
        6,
        2,
        [expect.objectContaining({ campo: "foto_facial" })],
      ),
    );
  });

  it("muestra el estado Pendiente en las miniaturas de documento sin imagen", async () => {
    const { getByTestId, getAllByText } = await renderConApi({});

    await waitFor(() => expect(getByTestId("doc-frente")).toBeTruthy());
    expect(getByTestId("doc-reverso")).toBeTruthy();
    expect(getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("muestra Verificado en la miniatura de documento con frente cargado", async () => {
    const tarjetaConDocumento = { ...tarjeta, documentoFrenteUrl: "https://cdn.test/doc.jpg" };
    const { getByTestId, getByText } = await renderConApi({
      tarjeta: jest.fn().mockResolvedValue(tarjetaConDocumento),
    });

    await waitFor(() => expect(getByTestId("doc-frente")).toBeTruthy());
    expect(getByText("Verificado")).toBeTruthy();
  });

  it("tocar la miniatura del documento abre el modal para ver/subir", async () => {
    const { getByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("doc-frente")).toBeTruthy());
    await fireEvent.press(getByTestId("doc-frente"));

    expect(getByTestId("documento-modal")).toBeTruthy();
  });

  it("desde el modal de reverso sube la evidencia documento_reverso (no frente)", async () => {
    const agregarEvidenciasCliente = jest.fn().mockResolvedValue({ clienteId: 2 });
    const { getByTestId, getByText } = await renderConApi({ agregarEvidenciasCliente });

    await waitFor(() => expect(getByTestId("doc-reverso")).toBeTruthy());
    await fireEvent.press(getByTestId("doc-reverso"));

    expect(getByText("Documento — reverso")).toBeTruthy();
    await fireEvent.press(getByTestId("documento-libreria"));

    await waitFor(() =>
      expect(agregarEvidenciasCliente).toHaveBeenCalledWith(
        6,
        2,
        [expect.objectContaining({ campo: "documento_reverso" })],
      ),
    );
  });

  it("muestra Verificado en la miniatura del reverso cuando la tarjeta trae documentoReversoUrl", async () => {
    const tarjetaConReverso = { ...tarjeta, documentoReversoUrl: "https://cdn.test/reverso.jpg" };
    const { getByTestId, getByText } = await renderConApi({
      tarjeta: jest.fn().mockResolvedValue(tarjetaConReverso),
    });

    await waitFor(() => expect(getByTestId("doc-reverso")).toBeTruthy());
    expect(getByText("Verificado")).toBeTruthy();
  });
});

describe("ClienteScreen — registrar préstamo (modal)", () => {
  it("abre el modal desde + Nuevo y llama crearPrestamo con los campos", async () => {
    const crearPrestamo = jest.fn().mockResolvedValue({ id: 5 });
    const { getByTestId } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));

    expect(getByTestId("prestamo-form")).toBeTruthy();
    await fireEvent.changeText(getByTestId("prestamo-valor"), "800");
    await fireEvent.changeText(getByTestId("prestamo-cuotas"), "4");
    await fireEvent.changeText(getByTestId("prestamo-dias"), "7");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    await waitFor(() =>
      expect(crearPrestamo).toHaveBeenCalledWith(6, {
        clienteId: 2,
        valor: 800,
        numCuotas: 4,
        diasEntreCuotas: 7,
        tipoInteres: 20,
      }),
    );
  });

  it("no llama crearPrestamo si la validación falla", async () => {
    const crearPrestamo = jest.fn();
    const { getByTestId, getByText } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    await fireEvent.changeText(getByTestId("prestamo-valor"), "");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    expect(crearPrestamo).not.toHaveBeenCalled();
    expect(getByText(/Ingresa un valor de préstamo válido/)).toBeTruthy();
  });

  it("autocompleta interés, cuotas y valor desde la ruta activa", async () => {
    const crearPrestamo = jest.fn().mockResolvedValue({ id: 5 });
    const { getByTestId } = await renderConApi({ crearPrestamo });

    await waitFor(() => expect(getByTestId("btn-nuevo-prestamo")).toBeTruthy());
    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));

    expect(getByTestId("prestamo-valor").props.value).toBe("1500");
    expect(getByTestId("prestamo-cuotas").props.value).toBe("8");
    expect(getByTestId("prestamo-interes").props.value).toBe("20");

    await fireEvent.changeText(getByTestId("prestamo-dias"), "7");
    await fireEvent.press(getByTestId("guardar-prestamo"));

    await waitFor(() =>
      expect(crearPrestamo).toHaveBeenCalledWith(6, {
        clienteId: 2,
        valor: 1500,
        numCuotas: 8,
        diasEntreCuotas: 7,
        tipoInteres: 20,
      }),
    );
  });
});

describe("ClienteScreen — acordeón de préstamos y detalle", () => {
  it("seleccionar un préstamo expande su detalle y oculta los demás; tocar de nuevo colapsa", async () => {
    const prestamo2: PrestamoPublic = {
      ...prestamo,
      id: 2,
      estatus: "cancelado",
      cuotas: [],
    };
    const { getByTestId, queryByTestId } = await renderConApi({
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamo, prestamo2]),
    });

    await waitFor(() => expect(getByTestId("prestamo-item-1")).toBeTruthy());
    expect(getByTestId("prestamo-item-2")).toBeTruthy();
    expect(queryByTestId("detalle-prestamo")).toBeNull();

    await fireEvent.press(getByTestId("prestamo-item-1"));
    await waitFor(() => expect(getByTestId("detalle-prestamo")).toBeTruthy());
    expect(queryByTestId("prestamo-item-2")).toBeNull();
    expect(getByTestId("check-prestamo-1")).toBeTruthy();

    await fireEvent.press(getByTestId("prestamo-item-1"));
    expect(queryByTestId("detalle-prestamo")).toBeNull();
    expect(getByTestId("prestamo-item-2")).toBeTruthy();
  });

  it("cambiar de préstamo seleccionado oculta el detalle del anterior", async () => {
    const prestamo2: PrestamoPublic = {
      ...prestamo,
      id: 2,
      estatus: "liquidado",
      cuotas: [],
    };
    const { getByTestId, queryByTestId } = await renderConApi({
      listarPrestamosDeCliente: jest.fn().mockResolvedValue([prestamo, prestamo2]),
    });

    await waitFor(() => expect(getByTestId("prestamo-item-1")).toBeTruthy());
    await fireEvent.press(getByTestId("prestamo-item-1"));
    await waitFor(() => expect(getByTestId("detalle-prestamo")).toBeTruthy());

    await fireEvent.press(getByTestId("prestamo-item-1"));
    await fireEvent.press(getByTestId("prestamo-item-2"));
    await waitFor(() => expect(getByTestId("detalle-prestamo")).toBeTruthy());
    expect(queryByTestId("prestamo-item-1")).toBeNull();
  });

  it("el modal de detalle de cuota llama detalleCuota con los ids correctos", async () => {
    const detalleCuota = jest.fn().mockResolvedValue({
      cuotaId: 10,
      prestamoId: 1,
      numeroCuota: 1,
      valorEsperado: 300,
      fechaVencimiento: "2026-08-08",
      estatus: "pendiente",
      pagos: [{ id: 1, valor: 300, metodoPago: "efectivo", fecha: "2026-08-08" }],
      abonosAcumulados: 0,
      saldoPendiente: 300,
      ultimaVisita: null,
    });
    const { getByTestId } = await renderConApi(
      { detalleCuota },
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("cuota-1")).toBeTruthy());
    await fireEvent.press(getByTestId("cuota-1"));

    await waitFor(() =>
      expect(detalleCuota).toHaveBeenCalledWith(6, 1, 10),
    );
    expect(getByTestId("cuota-dialog")).toBeTruthy();
  });

  it("los modales son excluyentes (nuevo préstamo cierra editar)", async () => {
    const { getByTestId, queryByTestId } = await renderConApi({});

    await waitFor(() => expect(getByTestId("btn-editar-cliente")).toBeTruthy());

    await fireEvent.press(getByTestId("btn-editar-cliente"));
    expect(getByTestId("editar-cliente-form")).toBeTruthy();

    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    expect(getByTestId("prestamo-form")).toBeTruthy();
    expect(queryByTestId("editar-cliente-form")).toBeNull();
  });

  it("abrir pago cierra el modal de préstamo", async () => {
    const { getByTestId, queryByTestId } = await renderConApi(
      {},
      offlineValor,
      { prestamoAutoSeleccionado: true },
    );

    await waitFor(() => expect(getByTestId("btn-pago")).toBeTruthy());

    await fireEvent.press(getByTestId("btn-nuevo-prestamo"));
    expect(getByTestId("prestamo-form")).toBeTruthy();

    await fireEvent.press(getByTestId("btn-pago"));
    expect(getByTestId("form-pago")).toBeTruthy();
    expect(queryByTestId("prestamo-form")).toBeNull();
  });
});

describe("ClienteScreen — lista de préstamos con color", () => {
  it("lista todos los préstamos del cliente con su color de estado", async () => {
    const prestamoCancelado: PrestamoPublic = {
      ...prestamo,
      id: 2,
      estatus: "cancelado",
      cuotas: [],
    };
    const { getByTestId, getAllByTestId } = await renderConApi({
      listarPrestamosDeCliente: jest
        .fn()
        .mockResolvedValue([prestamo, prestamoCancelado]),
    });

    await waitFor(() => expect(getByTestId("prestamo-item-1")).toBeTruthy());
    expect(getByTestId("prestamo-item-2")).toBeTruthy();
    expect(getAllByTestId("color-badge-verde").length).toBeGreaterThan(0);
    expect(getByTestId("color-badge-blanco")).toBeTruthy();
  });
});