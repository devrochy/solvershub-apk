jest.mock("@react-native-async-storage/async-storage", () => {
  let almacen = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => almacen.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        almacen.set(k, v);
      }),
      removeItem: jest.fn(async (k: string) => {
        almacen.delete(k);
      }),
      clear: jest.fn(async () => {
        almacen.clear();
      }),
      _almacen: almacen,
    },
  };
});

jest.mock("expo-crypto", () => {
  let secuencia = 0;
  return {
    randomUUID: jest.fn(
      () => `11111111-2222-4333-8444-${String(++secuencia).padStart(12, "0")}`,
    ),
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MAX_COLA,
  contarCola,
  encolar,
  existePendiente,
  fusionarPendiente,
  insertarEvento,
  limpiarCola,
  listarCola,
  removerDeCola,
} from "./cola";

describe("cola offline", () => {
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  });

  it("encola un evento con eventoIdCliente generado", async () => {
    const evento = await encolar("visita", { clienteId: "2" });

    expect(evento!.eventoIdCliente).toBe("11111111-2222-4333-8444-000000000001");
    expect(evento!.tipoEvento).toBe("visita");
    expect(evento!.payload).toEqual({ clienteId: "2" });
    await expect(contarCola()).resolves.toBe(1);
  });

  it("listarCola devuelve los eventos en orden", async () => {
    await encolar("visita", { a: 1 });
    await encolar("gasto", { b: 2 });

    const cola = await listarCola();

    expect(cola.map((e) => e.tipoEvento)).toEqual(["visita", "gasto"]);
  });

  it("removerDeCola quita solo el evento indicado", async () => {
    await encolar("visita", {});
    const segundo = await encolar("gasto", {});
    await removerDeCola(segundo!.eventoIdCliente);

    const cola = await listarCola();
    expect(cola.map((e) => e.tipoEvento)).toEqual(["visita"]);
  });

  it("limpiarCola vacía la cola", async () => {
    await encolar("visita", {});
    await limpiarCola();

    await expect(contarCola()).resolves.toBe(0);
  });

  it("existePendiente detecta un evento pendiente con la misma dedupeKey", async () => {
    await encolar("visita", { cuotaId: "3359" }, "pago-3359");

    await expect(existePendiente("visita", "pago-3359")).resolves.toBe(true);
    await expect(existePendiente("visita", "pago-3360")).resolves.toBe(false);
  });

  it("no encola cuando la cola está llena (REQ-APK-009)", async () => {
    const cola = Array.from({ length: MAX_COLA }, (_, i) => ({
      eventoIdCliente: `e-${i}`,
      tipoEvento: "visita",
      payload: {},
      creadoEn: "2026-09-01T00:00:00.000Z",
    }));
    await insertarEvento(cola[0]);
    // Rellena hasta el tope directamente.
    await AsyncStorage.setItem("cobranza_cola_offline", JSON.stringify(cola));

    await expect(encolar("visita", {})).resolves.toBeNull();
    await expect(contarCola()).resolves.toBe(MAX_COLA);
  });

  it("fusiona la 2ª edición del mismo cliente en vez de descartarla (REQ-APK-011)", async () => {
    await encolar(
      "cambio_cliente",
      { clienteId: "2", input: { nombre: "Ana" } },
      "cambio_cliente-2",
    );

    const fusionado = await fusionarPendiente("cambio_cliente", "cambio_cliente-2", {
      clienteId: "2",
      input: { telefonoWhatsapp: "300" },
    });

    expect(fusionado).toBe(true);
    const cola = await listarCola();
    expect(cola).toHaveLength(1);
    expect(cola[0].payload).toEqual({
      clienteId: "2",
      input: { nombre: "Ana", telefonoWhatsapp: "300" },
    });
  });
});