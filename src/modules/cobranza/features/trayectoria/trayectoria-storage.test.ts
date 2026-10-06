import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  guardarTrayectoriaActiva,
  leerTrayectoriaActiva,
  limpiarTrayectoriaActiva,
} from "./trayectoria-storage";

describe("trayectoria-storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("guarda y lee la trayectoria con sus puntos", async () => {
    await guardarTrayectoriaActiva({
      puntos: [{ latitud: -17.78, longitud: -63.18 }],
      activa: true,
    });

    expect(await leerTrayectoriaActiva()).toEqual({
      puntos: [{ latitud: -17.78, longitud: -63.18 }],
      activa: true,
    });
  });

  it("devuelve null si no hay trayectoria guardada", async () => {
    expect(await leerTrayectoriaActiva()).toBeNull();
  });

  it("devuelve null si el contenido está corrupto", async () => {
    await AsyncStorage.setItem("cobranza_trayectoria_activa", "{no-json");

    expect(await leerTrayectoriaActiva()).toBeNull();
  });

  it("limpia la trayectoria guardada", async () => {
    await guardarTrayectoriaActiva({ puntos: [], activa: true });

    await limpiarTrayectoriaActiva();

    expect(await leerTrayectoriaActiva()).toBeNull();
  });
});
