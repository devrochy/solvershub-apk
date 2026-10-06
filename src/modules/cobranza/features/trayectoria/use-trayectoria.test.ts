jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

jest.mock("./trayectoria-storage", () => ({
  guardarTrayectoriaActiva: jest.fn().mockResolvedValue(undefined),
  leerTrayectoriaActiva: jest.fn().mockResolvedValue(null),
  limpiarTrayectoriaActiva: jest.fn().mockResolvedValue(undefined),
}));

import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import * as storage from "./trayectoria-storage";
import { useTrayectoria } from "./use-trayectoria";

const locMock = Location as jest.Mocked<typeof Location>;

type Callback = (ubicacion: { coords: { latitude: number; longitude: number } }) => void;

describe("useTrayectoria", () => {
  let callback: Callback;
  let remove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    callback = () => undefined;
    remove = jest.fn();
    (locMock.watchPositionAsync as jest.Mock).mockImplementation(
      async (_opts, cb: Callback) => {
        callback = cb;
        return { remove };
      },
    );
  });

  it("no inicia si no se concede el permiso de ubicación", async () => {
    (locMock.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false,
    } as never);

    const { result } = await renderHook(() => useTrayectoria());

    await act(async () => {
      await result.current.iniciar();
    });

    expect(result.current.activa).toBe(false);
    expect(result.current.error).toBeTruthy();
    expect(locMock.watchPositionAsync).not.toHaveBeenCalled();
  });

  it("inicia, acumula puntos de la ubicación y se activa", async () => {
    (locMock.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    } as never);

    const { result } = await renderHook(() => useTrayectoria());

    await act(async () => {
      await result.current.iniciar();
    });
    expect(result.current.activa).toBe(true);
    expect(locMock.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ distanceInterval: 20, timeInterval: 15000 }),
      expect.any(Function),
    );

    await act(async () => {
      callback({ coords: { latitude: -17.78, longitude: -63.18 } });
      callback({ coords: { latitude: -17.79, longitude: -63.19 } });
    });

    expect(result.current.puntos).toEqual([
      { latitud: -17.78, longitud: -63.18 },
      { latitud: -17.79, longitud: -63.19 },
    ]);
  });

  it("detener limpia la suscripción y devuelve los puntos acumulados", async () => {
    (locMock.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    } as never);

    const { result } = await renderHook(() => useTrayectoria());

    await act(async () => {
      await result.current.iniciar();
    });
    await act(async () => {
      callback({ coords: { latitude: -17.78, longitude: -63.18 } });
    });

    let puntos: ReturnType<typeof result.current.detener> = [];
    await act(async () => {
      puntos = result.current.detener();
    });

    expect(remove).toHaveBeenCalled();
    expect(result.current.activa).toBe(false);
    expect(puntos).toEqual([{ latitud: -17.78, longitud: -63.18 }]);
  });
});
describe("useTrayectoria — persistencia", () => {
  let callback: Callback;
  let remove: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    callback = () => undefined;
    remove = jest.fn();
    (storage.leerTrayectoriaActiva as jest.Mock).mockResolvedValue(null);
    (Location.watchPositionAsync as unknown as jest.Mock).mockImplementation(
      async (_opts, cb: Callback) => {
        callback = cb;
        return { remove };
      },
    );
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true,
    } as never);
  });

  it("restaura los puntos y reanuda el GPS si había una trayectoria activa", async () => {
    (storage.leerTrayectoriaActiva as jest.Mock).mockResolvedValue({
      puntos: [{ latitud: -17.78, longitud: -63.18 }],
      activa: true,
    });

    const { result } = await renderHook(() => useTrayectoria());

    await waitFor(() => expect(result.current.activa).toBe(true));
    expect(result.current.puntos).toEqual([{ latitud: -17.78, longitud: -63.18 }]);
    expect(Location.watchPositionAsync).toHaveBeenCalled();
  });

  it("persiste los puntos y limpia la trayectoria al detener", async () => {
    const { result } = await renderHook(() => useTrayectoria());

    await act(async () => {
      await result.current.iniciar();
    });
    await act(async () => {
      callback({ coords: { latitude: -17.5, longitude: -63.2 } });
    });

    await waitFor(() =>
      expect(storage.guardarTrayectoriaActiva).toHaveBeenCalledWith(
        expect.objectContaining({ puntos: [{ latitud: -17.5, longitud: -63.2 }] }),
      ),
    );

    await act(async () => {
      result.current.detener();
    });
    expect(storage.limpiarTrayectoriaActiva).toHaveBeenCalled();
  });
});
