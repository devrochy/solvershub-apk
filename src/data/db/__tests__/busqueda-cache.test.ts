import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import { buscarEnCache } from "../../busqueda-cache";
import { guardarCache } from "../../repos/cache";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

describe("búsqueda local sobre caché (HU-APP-14/15)", () => {
  it("encuentra por subcadena en el JSON cacheado", async () => {
    const db = await base();
    await guardarCache(db, {
      modulo: "operacion",
      entidad: "clientes",
      id: "c-1",
      json: JSON.stringify({ id: "c-1", nombre: "Juanita Mercado", telefono: "7000111" }),
      updatedAt: "2026-10-06T00:00:00Z",
    });
    await guardarCache(db, {
      modulo: "comercio",
      entidad: "productos",
      id: "p-1",
      json: JSON.stringify({ id: "p-1", nombre: "Chaqueta impermeable" }),
      updatedAt: "2026-10-06T00:00:00Z",
    });

    const resultados = await buscarEnCache(db, "juanita");
    expect(resultados.length).toBe(1);
    expect(resultados[0].modulo).toBe("operacion");
    expect(resultados[0].entidad).toBe("clientes");

    const productos = await buscarEnCache(db, "chaqueta");
    expect(productos.length).toBe(1);
    expect(productos[0].entidad).toBe("productos");
  });

  it("con menos de 2 caracteres no busca", async () => {
    const db = await base();
    expect(await buscarEnCache(db, "j")).toEqual([]);
  });
});
