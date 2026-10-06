jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import {
  borrarCache,
  guardarCache,
  leerCache,
  limpiarEntidad,
} from "../../repos/cache";
import {
  encolarEvento,
  eventosPendientes,
  marcarEvento,
  totalEventos,
} from "../../repos/cola";
import {
  auditoriaPendiente,
  marcarAuditoriaSincronizada,
  registrarAuditoria,
} from "../../repos/auditoria-local";
import {
  migracionRealizada,
  migrarColaDesdeAsyncStorage,
} from "../../migracion/desde-asyncstorage";

async function baseLista() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

describe("capa de datos (ADR-APP-05)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("migrarTablas crea las 4 tablas del esquema", async () => {
    const db = await baseLista();
    expect(db.filasDe("cache_entidad")).toEqual([]);
    expect(db.filasDe("cola_evento")).toEqual([]);
    expect(db.filasDe("auditoria_local")).toEqual([]);
    expect(db.filasDe("sync_cursor")).toEqual([]);
  });

  it("caché: guarda, lee, actualiza y borra", async () => {
    const db = await baseLista();
    await guardarCache(db, {
      modulo: "comercio",
      entidad: "productos",
      id: "p-1",
      json: '{"nombre":"X"}',
      updatedAt: "2026-10-06T00:00:00Z",
    });
    const fila = await leerCache(db, "comercio", "productos", "p-1");
    expect(fila?.json).toBe('{"nombre":"X"}');

    await guardarCache(db, {
      modulo: "comercio",
      entidad: "productos",
      id: "p-1",
      json: '{"nombre":"Y"}',
      updatedAt: "2026-10-06T01:00:00Z",
    });
    expect((await leerCache(db, "comercio", "productos", "p-1"))?.json).toBe('{"nombre":"Y"}');

    await borrarCache(db, "comercio", "productos", "p-1");
    expect(await leerCache(db, "comercio", "productos", "p-1")).toBeNull();

    await guardarCache(db, {
      modulo: "comercio",
      entidad: "productos",
      id: "p-2",
      json: "{}",
      updatedAt: "x",
    });
    await limpiarEntidad(db, "comercio", "productos");
    expect(await leerCache(db, "comercio", "productos", "p-2")).toBeNull();
  });

  it("cola: encola con idempotencia y lista solo pendientes", async () => {
    const db = await baseLista();
    const evento = {
      id: "e-1",
      modulo: "cobranza",
      tipo: "pago",
      payload: '{"clienteId":"c-1"}',
      creadoAt: "2026-10-06T00:00:00Z",
    };
    await encolarEvento(db, evento);
    await encolarEvento(db, evento); // idempotente
    expect(await totalEventos(db, "cobranza")).toBe(1);
    expect((await eventosPendientes(db, "cobranza")).length).toBe(1);

    await marcarEvento(db, "e-1", "enviado");
    expect((await eventosPendientes(db, "cobranza")).length).toBe(0);
  });

  it("auditoría local: registra y marca sincronizadas", async () => {
    const db = await baseLista();
    await registrarAuditoria(db, {
      id: "a-1",
      accion: "eliminar_cuota",
      entidad: "cuota",
      entidadId: "q-1",
      payload: "{}",
      user: "u-1",
      device: "d-1",
      ts: "2026-10-06T00:00:00Z",
    });
    expect((await auditoriaPendiente(db)).length).toBe(1);

    await marcarAuditoriaSincronizada(db, "a-1");
    expect((await auditoriaPendiente(db)).length).toBe(0);
  });

  it("migración de la cola legacy verifica totales y borra el origen", async () => {
    const db = await baseLista();
    const mapaSeguro = new Map<string, string>();
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) =>
      Promise.resolve(mapaSeguro.get(k) ?? null),
    );
    (SecureStore.setItemAsync as jest.Mock).mockImplementation(
      (k: string, v: string) => {
        mapaSeguro.set(k, v);
        return Promise.resolve();
      },
    );
    (SecureStore.deleteItemAsync as jest.Mock).mockImplementation((k: string) => {
      mapaSeguro.delete(k);
      return Promise.resolve();
    });
    await AsyncStorage.setItem(
      "cobranza_cola_offline",
      JSON.stringify([
        { id: "l-1", tipoEvento: "pago", payload: {}, creadoAt: "2026-10-06T00:00:00Z" },
        { id: "l-2", tipoEvento: "gasto", payload: {}, creadoAt: "2026-10-06T00:01:00Z" },
      ]),
    );
    const resultado = await migrarColaDesdeAsyncStorage(db);
    expect(resultado).toEqual({ migrados: 2 });
    expect(await totalEventos(db, "cobranza")).toBe(2);
    expect(await AsyncStorage.getItem("cobranza_cola_offline")).toBeNull();
    expect(await migracionRealizada()).toBe(true);

    // Segunda corrida: no migra de nuevo.
    await AsyncStorage.setItem(
      "cobranza_cola_offline",
      JSON.stringify([{ id: "l-3", tipoEvento: "pago", payload: {} }]),
    );
    expect(await migrarColaDesdeAsyncStorage(db)).toEqual({ migrados: 0 });
    expect(await totalEventos(db, "cobranza")).toBe(2);
  });
});
