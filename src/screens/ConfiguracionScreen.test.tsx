import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ConfiguracionScreen } from "./ConfiguracionScreen";
import { OfflineContext, OfflineValue } from "../offline/offline-context";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { name: "Solver", version: "1.0.0" } },
}));

async function renderConOffline(overrides: Partial<OfflineValue> = {}) {
  const offline: OfflineValue = {
    isOnline: true,
    sinSubir: 3,
    errorSync: null,
    ultimaSincronizacion: null,
    versionRecarga: 0,
    encolar: jest.fn().mockResolvedValue(undefined),
    encolarSiNoExiste: jest.fn().mockResolvedValue(true),
    sincronizar: jest.fn().mockResolvedValue(undefined),
    sincronizarGeneral: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const rendered = await render(
    <OfflineContext.Provider value={offline}>
      <ConfiguracionScreen />
    </OfflineContext.Provider>,
  );
  return { ...rendered, offline };
}

describe("ConfiguracionScreen", () => {
  it("muestra el nombre y la versión de la app", async () => {
    const { getByTestId } = await renderConOffline();

    expect(getByTestId("config-app").props.children).toBe("Solver");
    expect(getByTestId("config-version").props.children).toBe("1.0.0");
  });

  it("muestra la última sincronización y los pendientes", async () => {
    const { getByTestId } = await renderConOffline({
      ultimaSincronizacion: 1726000000000,
      sinSubir: 2,
    });

    expect(getByTestId("sync-ultima").props.children).not.toBe("Nunca");
    expect(getByTestId("sync-pendientes").props.children).toBe(2);
  });

  it("muestra 'Nunca' si no hubo sincronización", async () => {
    const { getByTestId } = await renderConOffline({ ultimaSincronizacion: null });

    expect(getByTestId("sync-ultima").props.children).toBe("Nunca");
  });

  it("sincroniza al tocar los botones", async () => {
    const { getByTestId, offline } = await renderConOffline();

    fireEvent.press(getByTestId("btn-sincronizar"));
    await waitFor(() => expect(offline.sincronizar).toHaveBeenCalled());

    fireEvent.press(getByTestId("btn-sincronizar-general"));
    await waitFor(() => expect(offline.sincronizarGeneral).toHaveBeenCalled());
  });
});
