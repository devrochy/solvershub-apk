import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  guardarUltimaSincronizacion,
  leerUltimaSincronizacion,
} from "./sync-meta";

describe("sync-meta", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("guarda y lee la última sincronización", async () => {
    expect(await leerUltimaSincronizacion()).toBeNull();

    await guardarUltimaSincronizacion(1726000000000);

    expect(await leerUltimaSincronizacion()).toBe(1726000000000);
  });

  it("devuelve null si el valor guardado no es numérico", async () => {
    await AsyncStorage.setItem("cobranza_ultima_sincronizacion", "abc");

    expect(await leerUltimaSincronizacion()).toBeNull();
  });
});
