import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import { sincronizarTodo, ENTIDADES_POR_MODULO } from "../../sync-global";
import { leerCursor } from "../../repos/sync-cursor";
import { leerCache } from "../../repos/cache";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

function paginaDe(entidad: string, items: Record<string, unknown>[]) {
  return { entidad, items, nextCursor: `cursor-${entidad}`, deletedIds: [] };
}

describe("sync global (HU-APP-15)", () => {
  it("recorre todas las entidades y guarda cursores por entidad", async () => {
    const db = await base();
    const cliente = {
      get: jest.fn(async (path: string) => {
        const entidad = String(path).split("/").pop() ?? "";
        return paginaDe(entidad, [{ id: `${entidad}-1`, updatedAt: "2026-10-06T00:00:00Z" }]);
      }),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    };

    const resumen = await sincronizarTodo(db, cliente as never);

    expect(resumen.length).toBe(Object.keys(ENTIDADES_POR_MODULO).length);
    // spot checks
    expect((await leerCache(db, "operacion", "conversaciones", "conversaciones-1"))?.json).toContain(
      "conversaciones-1",
    );
    expect(await leerCursor(db, "cobranza", "promesas")).toBe("cursor-promesas");
  });

  it("un error en una entidad corta su módulo y sigue con los demás", async () => {
    const db = await base();
    const cliente = {
      get: jest.fn(async (path: string) => {
        if (String(path).includes("/sync/productos")) {
          throw new Error("red");
        }
        const entidad = String(path).split("/").pop() ?? "";
        return paginaDe(entidad, []);
      }),
      post: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    };

    const resumen = await sincronizarTodo(db, cliente as never);
    const comercio = resumen.find((r) => r.modulo === "comercio");
    const operacion = resumen.find((r) => r.modulo === "operacion");
    expect(comercio?.error?.entidad).toBeDefined();
    expect(operacion?.error).toBeUndefined();
    expect(await leerCursor(db, "operacion", "conversaciones")).toBe("cursor-conversaciones");
  });
});
