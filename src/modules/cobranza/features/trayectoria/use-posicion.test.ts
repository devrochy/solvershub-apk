jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

import { act, renderHook } from "@testing-library/react-native";
import * as Location from "expo-location";
import { usePosicion } from "./use-posicion";

const locMock = Location as jest.Mocked<typeof Location>;

function apiMock() {
  return {
    registrarPosicion: jest.fn().mockResolvedValue({ carteraId: "6" }),
  };
}

describe("usePosicion", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (locMock.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    });
    (locMock.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 5.07, longitude: -75.52 },
    });
  });

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it("envía la posición inicial cuando la trayectoria está activa", async () => {
  const api = apiMock();
await renderHook(() => usePosicion(api as never, "6", true, 0));

  await act(async () => {
    await Promise.resolve();
  });

  expect(api.registrarPosicion).toHaveBeenCalledWith("6", {
    latitud: 5.07,
    longitud: -75.52,
  });
});

it("re-envía la posición en el intervalo periódico", async () => {
  const api = apiMock();
await renderHook(() => usePosicion(api as never, "6", true, 0));

  await act(async () => {
    await Promise.resolve();
  });

  await act(async () => {
    jest.advanceTimersByTime(30000);
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(api.registrarPosicion).toHaveBeenCalledTimes(2);
});

it("no envía posiciones si la trayectoria no está activa", async () => {
  const api = apiMock();
await renderHook(() => usePosicion(api as never, "6", false, 0));

  await act(async () => {
    jest.advanceTimersByTime(30000);
  });

  expect(api.registrarPosicion).not.toHaveBeenCalled();
});
});