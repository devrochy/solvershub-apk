jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));
jest.mock("expo-crypto", () => ({ getRandomBytesAsync: jest.fn() }));
jest.mock("@core/secure-kv", () => ({
  secureGet: jest.fn(),
  secureSet: jest.fn(),
}));

const db = { execAsync: jest.fn() };

async function cargar() {
  jest.resetModules();
  jest.clearAllMocks();
  db.execAsync.mockReset().mockResolvedValue(undefined);
  const sqlite = require("expo-sqlite");
  const crypto = require("expo-crypto");
  const kv = require("@core/secure-kv");
  const conexion = require("../conexion");
  return {
    abrirBaseCifrada: conexion.abrirBaseCifrada,
    openDatabaseAsync: sqlite.openDatabaseAsync as jest.Mock,
    getRandomBytesAsync: crypto.getRandomBytesAsync as jest.Mock,
    secureGet: kv.secureGet as jest.Mock,
    secureSet: kv.secureSet as jest.Mock,
  };
}

describe("abrirBaseCifrada (ADR-APP-05)", () => {
  it("genera y guarda una sola clave aunque abran dos conexiones a la vez", async () => {
    const deps = await cargar();
    deps.openDatabaseAsync.mockResolvedValue(db);
    deps.secureGet.mockResolvedValue(null);
    let liberar: ((bytes: Uint8Array) => void) | undefined;
    deps.getRandomBytesAsync.mockImplementation(
      () =>
        new Promise<Uint8Array>((resolve) => {
          liberar = resolve;
        }),
    );

    const primera = deps.abrirBaseCifrada();
    const segunda = deps.abrirBaseCifrada();
    await new Promise((resolve) => setTimeout(resolve, 0));
    liberar?.(new Uint8Array(32).fill(7));
    await Promise.all([primera, segunda]);

    expect(deps.getRandomBytesAsync).toHaveBeenCalledTimes(1);
    expect(deps.secureSet).toHaveBeenCalledTimes(1);
    const claves = db.execAsync.mock.calls
      .map(([sql]) => String(sql))
      .filter((sql) => sql.startsWith("PRAGMA key"));
    expect(claves).toHaveLength(2);
    expect(new Set(claves).size).toBe(1);
  });

  it("reutiliza la clave que ya está en el almacén seguro", async () => {
    const deps = await cargar();
    deps.openDatabaseAsync.mockResolvedValue(db);
    deps.secureGet.mockResolvedValue("clave-existente");

    await deps.abrirBaseCifrada();

    expect(deps.getRandomBytesAsync).not.toHaveBeenCalled();
    expect(deps.secureSet).not.toHaveBeenCalled();
    expect(db.execAsync).toHaveBeenCalledWith("PRAGMA key = 'clave-existente';");
  });

  it("reintenta generar la clave si la primera vez falla", async () => {
    const deps = await cargar();
    deps.openDatabaseAsync.mockResolvedValue(db);
    deps.secureGet.mockResolvedValue(null);
    deps.getRandomBytesAsync
      .mockRejectedValueOnce(new Error("sin entropía"))
      .mockResolvedValue(new Uint8Array(32).fill(3));

    await expect(deps.abrirBaseCifrada()).rejects.toThrow("sin entropía");
    await expect(deps.abrirBaseCifrada()).resolves.toBeDefined();
    expect(deps.secureSet).toHaveBeenCalledTimes(1);
  });
});
