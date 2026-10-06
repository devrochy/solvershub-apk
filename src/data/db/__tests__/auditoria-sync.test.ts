import { migrarTablas } from "../migraciones";
import { crearSqliteFake } from "../../testing/fake-sqlite";
import {
  registrarAccionCritica,
  subirAuditoriaPendiente,
} from "../../auditoria-sync";
import { auditoriaPendiente } from "../../repos/auditoria-local";

async function base() {
  const db = crearSqliteFake();
  await migrarTablas(db);
  return db;
}

describe("auditoría local + subida idempotente (HU-APP-16)", () => {
  it("registra una acción crítica y la sube con ack sincronizado", async () => {
    const db = await base();
    const post = jest.fn().mockImplementation(async (_path: string, body: { events: { eventId: string }[] }) => ({
      eventos: body.events.map((e) => ({ eventId: e.eventId, estado: "sincronizado" })),
    }));
    const cliente = { get: jest.fn(), post, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

    const id = await registrarAccionCritica(db, {
      accion: "cambiar_estado_pedido",
      entidad: "pedido",
      entidadId: "o-1",
    });
    expect((await auditoriaPendiente(db)).length).toBe(1);

    const resultado = await subirAuditoriaPendiente(db, cliente);
    expect(resultado).toEqual({ subidos: 1, errores: 0 });
    expect(post).toHaveBeenCalledWith(
      "/audit/mobile-events",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({ eventId: id, accion: "cambiar_estado_pedido" }),
        ]),
      }),
    );
    expect((await auditoriaPendiente(db)).length).toBe(0);
  });

  it("un ack duplicado también cierra el evento local", async () => {
    const db = await base();
    const post = jest.fn().mockImplementation(async (_path: string, body: { events: { eventId: string }[] }) => ({
      eventos: body.events.map((e) => ({ eventId: e.eventId, estado: "duplicado" })),
    }));
    const cliente = { get: jest.fn(), post, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

    await registrarAccionCritica(db, { accion: "suspender_negocio", entidad: "tenant" });
    const resultado = await subirAuditoriaPendiente(db, cliente);
    expect(resultado.subidos).toBe(1);
    expect((await auditoriaPendiente(db)).length).toBe(0);
  });

  it("un error de red conserva los eventos pendientes", async () => {
    const db = await base();
    const post = jest.fn().mockRejectedValue(new Error("red"));
    const cliente = { get: jest.fn(), post, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

    await registrarAccionCritica(db, { accion: "cambiar_estado_pedido", entidad: "pedido" });
    const resultado = await subirAuditoriaPendiente(db, cliente);
    expect(resultado).toEqual({ subidos: 0, errores: 1 });
    expect((await auditoriaPendiente(db)).length).toBe(1);
  });
});
