jest.mock("@data/bootstrap", () => ({
  inicializarBase: jest.fn(),
  baseActual: jest.fn(),
}));
jest.mock("@data/migracion/desde-asyncstorage", () => ({
  migrarColaDesdeAsyncStorage: jest.fn().mockResolvedValue({ migrados: 0 }),
  migracionRealizada: jest.fn().mockResolvedValue(true),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));
jest.mock("expo-crypto", () => {
  let n = 0;
  return {
    randomUUID: jest.fn(
      () => `aaaaaaaa-bbbb-4ccc-8ddd-${String(++n).padStart(12, "0")}`,
    ),
  };
});

import { inicializarBase } from "@data/bootstrap";
import { migrarTablas } from "@data/db/migraciones";
import { crearSqliteFake } from "@data/testing/fake-sqlite";
import {
  __resetAlmacenColaPruebas,
  contarCola,
  encolar,
  fusionarPendiente,
  listarCola,
  removerDeCola,
} from "./cola";

async function baseSqlite() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  (inicializarBase as jest.Mock).mockResolvedValue(db);
  __resetAlmacenColaPruebas();
  return db;
}

describe("cola offline sobre SQLite (HU-APP-07)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("encola y lista desde la base cifrada (no AsyncStorage)", async () => {
    const db = await baseSqlite();

    const evento = await encolar("pago", { clienteId: "c-1" }, "dedupe-pago");
    expect(evento?.eventoIdCliente).toBeTruthy();
    expect(await contarCola()).toBe(1);

    const cola = await listarCola();
    expect(cola[0].tipoEvento).toBe("pago");
    expect(cola[0].payload).toEqual({ clienteId: "c-1" });
    expect(db.filasDe("cola_evento").length).toBe(1);
  });

  it("fusiona un pendiente del mismo tipo y clave", async () => {
    const db = await baseSqlite();
    await encolar("cambio_cliente", { input: { nombre: "A" } }, "cliente-1");
    const fusionado = await fusionarPendiente("cambio_cliente", "cliente-1", {
      input: { telefono: "7000111" },
    });
    expect(fusionado).toBe(true);

    const [evento] = await listarCola();
    const input = (evento.payload.input ?? {}) as Record<string, unknown>;
    expect(input).toEqual({ nombre: "A", telefono: "7000111" });
    expect(db.filasDe("cola_evento").length).toBe(1);
  });

  it("remueve eventos sincronizados", async () => {
    await baseSqlite();
    const a = await encolar("pago", {});
    const b = await encolar("gasto", {});
    expect(await contarCola()).toBe(2);

    await removerDeCola(a!.eventoIdCliente);
    expect(await contarCola()).toBe(1);
    expect((await listarCola())[0].eventoIdCliente).toBe(b!.eventoIdCliente);
  });
});
