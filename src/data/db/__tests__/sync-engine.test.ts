import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import { leerCache } from "../../repos/cache";
import { leerCursor } from "../../repos/sync-cursor";
import { sincronizarEntidad, sincronizarModulo } from "../../sync-engine";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

function pagina(items: Record<string, unknown>[], nextCursor: string, deletedIds: string[] = []) {
  return { entidad: "clientes_cobranza", items, nextCursor, deletedIds };
}

describe("sync-engine (HU-APP-15)", () => {
  it("sincroniza páginas, cachea filas y persiste el cursor", async () => {
    const db = await base();
    const respuestas = [
      pagina(
        [
          { id: "c-1", nombre: "Uno", updatedAt: "2026-10-06T00:00:00Z" },
          { id: "c-2", nombre: "Dos", updatedAt: "2026-10-06T00:01:00Z" },
        ],
        "cursor-1",
      ),
    ];
    const cliente = { get: jest.fn().mockResolvedValueOnce(respuestas[0]) };

    const resultado = await sincronizarEntidad(db, cliente, "cobranza", "clientes_cobranza");

    expect(resultado.escritos).toBe(2);
    expect(resultado.paginas).toBe(1);
    expect(resultado.nextCursor).toBe("cursor-1");
    expect((await leerCache(db, "cobranza", "clientes_cobranza", "c-1"))?.json).toContain("Uno");
    expect(await leerCursor(db, "cobranza", "clientes_cobranza")).toBe("cursor-1");
    expect(cliente.get).toHaveBeenCalledWith("/sync/clientes_cobranza", {
      cursor: undefined,
      limit: 200,
    });
  });

  it("usa el cursor guardado y aplica deletedIds (LWW en cache)", async () => {
    const db = await base();
    // Primera corrida deja c-1 cacheado.
    const clienteUno = {
      get: jest.fn().mockResolvedValueOnce(
        pagina([{ id: "c-1", nombre: "Viejo", updatedAt: "2026-10-06T00:00:00Z" }], "cursor-1"),
      ),
    };
    await sincronizarEntidad(db, clienteUno, "cobranza", "clientes_cobranza");

    // Segunda corrida: cambia c-1 (LWW) y borra c-2.
    const clienteDos = {
      get: jest.fn().mockResolvedValueOnce(
        pagina(
          [{ id: "c-1", nombre: "Nuevo", updatedAt: "2026-10-06T02:00:00Z" }],
          "cursor-2",
          ["c-2"],
        ),
      ),
    };
    const resultado = await sincronizarEntidad(db, clienteDos, "cobranza", "clientes_cobranza");

    expect(clienteDos.get).toHaveBeenCalledWith("/sync/clientes_cobranza", {
      cursor: "cursor-1",
      limit: 200,
    });
    expect((await leerCache(db, "cobranza", "clientes_cobranza", "c-1"))?.json).toContain("Nuevo");
    expect(resultado.borrados).toBe(1);
    expect(await leerCursor(db, "cobranza", "clientes_cobranza")).toBe("cursor-2");
  });

  it("un error de red corta el módulo y reporta la entidad", async () => {
    const db = await base();
    const cliente = {
      get: jest
        .fn()
        .mockResolvedValueOnce(pagina([], "cursor-x"))
        .mockRejectedValueOnce(new Error("red")),
    };

    const resultado = await sincronizarModulo(db, cliente, "cobranza", [
      "clientes_cobranza",
      "carteras",
    ]);

    expect(resultado.resultados).toHaveLength(1);
    expect(resultado.error?.entidad).toBe("carteras");
  });
});
