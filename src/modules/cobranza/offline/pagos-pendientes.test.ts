import { pagosPendientesDeCliente } from "./pagos-pendientes";
import type { EventoOffline } from "./cola";

function evento(payload: Record<string, unknown>, tipoEvento = "visita"): EventoOffline {
  return { eventoIdCliente: `test-${Math.random()}`, tipoEvento, payload, creadoEn: "2026-10-11T10:00:00.000Z" };
}

describe("pagosPendientesDeCliente (HU-DS-10)", () => {
  it("marca la cuota y el préstamo de un pago de cuota en la cola", () => {
    const r = pagosPendientesDeCliente(
      [evento({ resultado: "pago", clienteId: "11", prestamoId: "5", cuotaId: "51", tipoPago: "cuota" })],
      "11",
    );
    expect([...r.cuotas]).toEqual(["51"]);
    expect([...r.prestamos]).toEqual(["5"]);
  });

  it("un abono marca solo el préstamo", () => {
    const r = pagosPendientesDeCliente(
      [evento({ resultado: "pago", clienteId: 11, prestamoId: 5, tipoPago: "abono" })],
      "11",
    );
    expect(r.cuotas.size).toBe(0);
    expect([...r.prestamos]).toEqual(["5"]);
  });

  it("ignora no pagos, otros clientes y otros tipos de evento", () => {
    const r = pagosPendientesDeCliente(
      [
        evento({ resultado: "no_pago", clienteId: "11", prestamoId: "5" }),
        evento({ resultado: "pago", clienteId: "12", prestamoId: "6", cuotaId: "61" }),
        evento({ resultado: "pago", clienteId: "11", prestamoId: "7", cuotaId: "71" }, "cambio_cliente"),
      ],
      "11",
    );
    expect(r.cuotas.size).toBe(0);
    expect(r.prestamos.size).toBe(0);
  });
});
