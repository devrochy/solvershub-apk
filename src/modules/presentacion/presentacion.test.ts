import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CLAVE_PRESENTACION,
  debeMostrarPresentacion,
  leerPresentacionVista,
  marcarPresentacionVista,
} from "./presentacion";

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe("debeMostrarPresentacion", () => {
  it("solo se muestra sin sesión, sin haber visto y con movimiento", () => {
    expect(
      debeMostrarPresentacion({ haySesion: false, vista: false, reduceMotion: false }),
    ).toBe(true);
    expect(
      debeMostrarPresentacion({ haySesion: true, vista: false, reduceMotion: false }),
    ).toBe(false);
    expect(
      debeMostrarPresentacion({ haySesion: false, vista: true, reduceMotion: false }),
    ).toBe(false);
    expect(
      debeMostrarPresentacion({ haySesion: false, vista: false, reduceMotion: true }),
    ).toBe(false);
  });
});

describe("flag local de la presentación", () => {
  it("empieza sin ver y queda marcado al terminar", async () => {
    await expect(leerPresentacionVista()).resolves.toBe(false);
    await marcarPresentacionVista();
    await expect(leerPresentacionVista()).resolves.toBe(true);
    await expect(AsyncStorage.getItem(CLAVE_PRESENTACION)).resolves.toBe("1");
  });

  it("si la lectura falla, no retiene la entrada", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("sin storage"));
    await expect(leerPresentacionVista()).resolves.toBe(true);
  });
});
