import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import {
  encolarEscritura,
  enviarEventosPendientes,
  registrarDespachador,
} from "../../escrituras";
import { eventosPendientes, totalEventos } from "../../repos/cola";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

const cliente = { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

describe("escrituras encoladas (HU-APP-15)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("encola una escritura offline y el despachador la aplica al reconectar", async () => {
    const db = await base();
    const despachador = jest.fn().mockResolvedValue(undefined);
    registrarDespachador("comercio", despachador);

    await encolarEscritura(db, "comercio", "pedido_estado", { pedidoId: "o-1", status: "despachado" });
    expect(await totalEventos(db, "comercio")).toBe(1);

    const resultado = await enviarEventosPendientes(db, cliente, "comercio");
    expect(resultado).toEqual({ enviados: 1, errores: 0 });
    expect(despachador).toHaveBeenCalledWith(
      cliente,
      expect.objectContaining({ tipo: "pedido_estado" }),
    );
    expect((await eventosPendientes(db, "comercio")).length).toBe(0);
  });

  it("un error del despachador conserva el evento pendiente e incrementa intentos", async () => {
    const db = await base();
    registrarDespachador("comercio", jest.fn().mockRejectedValue(new Error("red")));

    await encolarEscritura(db, "comercio", "pedido_estado", { pedidoId: "o-1", status: "despachado" });
    const resultado = await enviarEventosPendientes(db, cliente, "comercio");

    expect(resultado).toEqual({ enviados: 0, errores: 1 });
    expect((await eventosPendientes(db, "comercio")).length).toBe(1);
    expect((await eventosPendientes(db, "comercio"))[0].intentos).toBe(1);
  });

  it("sin despachador registrado no se envían los eventos", async () => {
    const db = await base();
    await encolarEscritura(db, "otro", "algo", { x: 1 });
    const resultado = await enviarEventosPendientes(db, cliente, "otro");
    expect(resultado).toEqual({ enviados: 0, errores: 1 });
  });
});
