jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(32).fill(1)),
}));
jest.mock("@core/secure-kv", () => ({
  secureGet: jest.fn(),
  secureSet: jest.fn(),
  secureDelete: jest.fn(),
}));
jest.mock("../migraciones", () => ({ migrarTablas: jest.fn() }));

const db = { execAsync: jest.fn(), runAsync: jest.fn(), getAllAsync: jest.fn(), getFirstAsync: jest.fn() };

async function cargar() {
  jest.resetModules();
  jest.clearAllMocks();
  const sqlite = require("expo-sqlite");
  const kv = require("@core/secure-kv");
  const bootstrap = require("../../bootstrap");
  return {
    inicializarBase: bootstrap.inicializarBase,
    openDatabaseAsync: sqlite.openDatabaseAsync as jest.Mock,
    secureGet: kv.secureGet as jest.Mock,
  };
}

describe("inicializarBase (ADR-APP-05)", () => {
  it("abre una sola conexión cuando dos llamadas coinciden", async () => {
    const deps = await cargar();
    deps.secureGet.mockResolvedValue(null);
    deps.openDatabaseAsync.mockResolvedValue(db);

    const [primera, segunda] = await Promise.all([
      deps.inicializarBase(),
      deps.inicializarBase(),
    ]);

    expect(deps.openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(primera).toBe(segunda);
  });

  it("devuelve la misma instancia en llamadas posteriores", async () => {
    const deps = await cargar();
    deps.secureGet.mockResolvedValue(null);
    deps.openDatabaseAsync.mockResolvedValue(db);

    const primera = await deps.inicializarBase();
    const segunda = await deps.inicializarBase();

    expect(deps.openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(segunda).toBe(primera);
  });

  it("respeta el kill-switch local sin abrir la base", async () => {
    const deps = await cargar();
    deps.secureGet.mockResolvedValue("1");

    await expect(deps.inicializarBase()).resolves.toBeNull();
    expect(deps.openDatabaseAsync).not.toHaveBeenCalled();
  });
});
