import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { HeaderApp } from "./HeaderApp";
import { estadoDeSync } from "./EstadoSincronizacion";
import { OfflineContext, type OfflineValue } from "../offline/offline-context";
import { SessionContext, SessionValue } from "../session/session-context";

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

function offline(parcial: Partial<OfflineValue> = {}): OfflineValue {
  return {
    isOnline: true,
    sinSubir: 0,
    errorSync: null,
    ultimaSincronizacion: null,
    versionRecarga: 0,
    eventosError: [],
    reintentarEvento: jest.fn(),
    descartarEvento: jest.fn(),
    sincronizarGeneral: jest.fn().mockResolvedValue(undefined),
    encolar: jest.fn().mockResolvedValue(true),
    encolarSiNoExiste: jest.fn().mockResolvedValue(true),
    sincronizar: jest.fn().mockResolvedValue(undefined),
    ...parcial,
  };
}

function renderHeader(valorOffline?: OfflineValue) {
  const valor: SessionValue = {
    gestor: { id: "1", usuario: "gestor1", nombre: "Test", apellido: "Uno", rol: "gestor" },
    loading: false,
    api: {} as SessionValue["api"],
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
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <SessionContext.Provider value={valor}>
        {valorOffline ? (
          <OfflineContext.Provider value={valorOffline}>
            <HeaderApp titulo="Inicio" />
          </OfflineContext.Provider>
        ) : (
          <HeaderApp titulo="Inicio" />
        )}
      </SessionContext.Provider>
    </SafeAreaProvider>,
  );
}

describe("HeaderApp", () => {
  it("no muestra botón atrás (navegación solo por menú/swipe)", async () => {
    const { queryByTestId, getByTestId } = await renderHeader();

    expect(queryByTestId("btn-volver")).toBeNull();
    expect(getByTestId("header-notificaciones")).toBeTruthy();
    expect(getByTestId("btn-menu")).toBeTruthy();
  });
});

describe("HeaderApp — estado de sincronización (HU-DS-10)", () => {
  it("sin conexión y con 3 cambios por enviar, el chip lo dice y cambia solo al volver la red", async () => {
    const utils = await renderHeader(offline({ isOnline: false, sinSubir: 3 }));

    expect(screen.getByText("Sin conexión · 3 cambios por enviar")).toBeTruthy();
    expect(screen.getByTestId("sync-status")).toHaveProp("accessibilityLiveRegion", "polite");

    // Vuelve la red y el motor vacía la cola: el chip se actualiza sin tocar nada.
    await utils.rerender(
      <SafeAreaProvider>
        <SessionContext.Provider value={{} as SessionValue}>
          <OfflineContext.Provider value={offline({ isOnline: true, sinSubir: 0 })}>
            <HeaderApp titulo="Inicio" />
          </OfflineContext.Provider>
        </SessionContext.Provider>
      </SafeAreaProvider>,
    );
    expect(screen.getByText("Sincronizado")).toBeTruthy();
    expect(screen.queryByText(/Sin conexión/)).toBeNull();
  });

  it("con error de sincronización ofrece Reintentar y llama a la sincronización que ya existe", async () => {
    let terminar: () => void = () => undefined;
    const sincronizar = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          terminar = resolve;
        }),
    );
    await renderHeader(
      offline({ isOnline: true, sinSubir: 2, errorSync: "No se pudo sincronizar.", sincronizar }),
    );

    const chip = screen.getByRole("button", { name: /No se pudo sincronizar · 2 cambios por enviar\. Reintentar/ });
    await fireEvent.press(chip);

    expect(sincronizar).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Enviando 2 cambios…")).toBeTruthy();

    terminar();
    await waitFor(() => expect(screen.getByText("Reintentar")).toBeTruthy());
  });

  it("fuera del OfflineProvider no muestra el chip (y el header no se rompe)", async () => {
    await renderHeader();
    expect(screen.queryByTestId("header-sync")).toBeNull();
    expect(screen.getByTestId("btn-menu")).toBeTruthy();
  });

  it("la campana y el menú tienen blancos táctiles de 48 dp", async () => {
    await renderHeader();
    expect(screen.getByTestId("header-notificaciones")).toHaveStyle({ minWidth: 48, minHeight: 48 });
    expect(screen.getByTestId("btn-menu")).toHaveStyle({ minWidth: 48, minHeight: 48 });
  });
});

describe("estadoDeSync", () => {
  it("prioriza sin conexión, luego el reintento en curso, luego el error", () => {
    expect(estadoDeSync({ isOnline: false, errorSync: "x", sincronizando: true })).toBe("offline");
    expect(estadoDeSync({ isOnline: true, errorSync: "x", sincronizando: true })).toBe("syncing");
    expect(estadoDeSync({ isOnline: true, errorSync: "x", sincronizando: false })).toBe("error");
    expect(estadoDeSync({ isOnline: true, errorSync: null, sincronizando: false })).toBe("online");
  });
});
