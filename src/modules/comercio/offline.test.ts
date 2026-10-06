import { migrarTablas } from "@data/db/migraciones";
import { crearSqliteFake } from "@data/testing/fake-sqlite";
import { eventosPendientes } from "@data/repos/cola";
import { cambiarEstadoPedidoConOffline, registrarDespachadorComercio } from "./offline";
import { enviarEventosPendientes } from "@data/escrituras";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

const cliente = {
  get: jest.fn(),
  post: jest.fn().mockResolvedValue(undefined),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
};

describe("comercio offline (HU-APP-15)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("online cambia directo contra la API", async () => {
    const db = await base();
    const resultado = await cambiarEstadoPedidoConOffline(db, cliente, "o-1", "despachado", true);
    expect(resultado).toBe("ok");
    expect(cliente.post).toHaveBeenCalledWith("/pack/commerce/orders/o-1/status", {
      status: "despachado",
    });
  });

  it("offline encola y el despachador lo aplica al reconectar", async () => {
    const db = await base();
    registrarDespachadorComercio();

    const resultado = await cambiarEstadoPedidoConOffline(db, cliente, "o-1", "despachado", false);
    expect(resultado).toBe("encolado");
    expect((await eventosPendientes(db, "comercio")).length).toBe(1);
    expect(cliente.post).not.toHaveBeenCalled();

    const envio = await enviarEventosPendientes(db, cliente, "comercio");
    expect(envio).toEqual({ enviados: 1, errores: 0 });
    expect(cliente.post).toHaveBeenCalledWith("/pack/commerce/orders/o-1/status", {
      status: "despachado",
    });
    expect((await eventosPendientes(db, "comercio")).length).toBe(0);
  });

  it("offline sin base lanza error controlado", async () => {
    await expect(
      cambiarEstadoPedidoConOffline(null, cliente, "o-1", "despachado", false),
    ).rejects.toThrow("offline_sin_base");
  });
});
