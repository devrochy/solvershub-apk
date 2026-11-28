jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "uuid-generada-1") }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { abrirBorrador, borrarBorrador, claveDelBorrador, guardarBorrador } from "./borrador";

const CLAVE = claveDelBorrador("t-1", "a-1");

beforeEach(() => AsyncStorage.clear());

describe("borrador con Idempotency-Key (HU-FB-07)", () => {
  it("al abrir sin borrador genera la clave y la guarda", async () => {
    const b = await abrirBorrador(CLAVE);
    expect(b.idempotencyKey).toBe("uuid-generada-1");
    expect(JSON.parse((await AsyncStorage.getItem(CLAVE)) ?? "{}").idempotencyKey).toBe("uuid-generada-1");
  });

  it("al volver a abrir reutiliza la clave del envío pendiente", async () => {
    await guardarBorrador(CLAVE, {
      idempotencyKey: "clave-pendiente",
      tipo: "error",
      area: "agenda",
      titulo: "No carga",
      descripcion: "La agenda no carga",
      imagenes: [],
    });
    const b = await abrirBorrador(CLAVE);
    expect(b.idempotencyKey).toBe("clave-pendiente");
    expect(b.titulo).toBe("No carga");
  });

  it("borrar quita borrador y clave; es por negocio y usuario", async () => {
    await abrirBorrador(CLAVE);
    await borrarBorrador(CLAVE);
    expect(await AsyncStorage.getItem(CLAVE)).toBeNull();
    expect(claveDelBorrador("t-2", "a-1")).not.toBe(CLAVE);
  });
});
