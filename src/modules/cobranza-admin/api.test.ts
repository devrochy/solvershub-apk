import type { ClienteAdmin } from "@core/api/admin";
import {
  actualizarCuota,
  crearCliente,
  crearPrestamo,
  eliminarAbono,
  registrarAbono,
  registrarPago,
} from "./api";

function apiFalsa() {
  const get = jest.fn();
  const post = jest.fn().mockResolvedValue({});
  const put = jest.fn().mockResolvedValue({});
  const del = jest.fn().mockResolvedValue(undefined);
  const api = { get, post, put, patch: jest.fn(), del } as unknown as ClienteAdmin;
  return { api, get, post, put, del };
}

describe("API de Cobranza (clientes)", () => {
  it("crea y actualiza clientes con el contrato del pack", async () => {
    const { api, post, put } = apiFalsa();
    const datos = {
      nombre: "Juana",
      apellido: "Pérez",
      telefono: "3001112233",
      negocio: "Tienda",
      cartera_id: "car-1",
      tipo_documento: "cc",
      numero_documento: "123",
      tope_maximo_deuda: 100000,
      color_riesgo: "blanco",
    };
    await crearCliente(api, datos);
    expect(post).toHaveBeenCalledWith("/pack/cobranza/clients", datos);
    await put.call({}, "/pack/cobranza/clients/c-1", datos);
  });

  it("crea un préstamo y registra pago y abono", async () => {
    const { api, post } = apiFalsa();
    await crearPrestamo(api, "c-1", {
      valor: 1000,
      num_cuotas: 4,
      tipo_interes: 10,
      dias_entre_cuotas: 7,
      fecha_otorgado: "2026-10-21",
    });
    expect(post).toHaveBeenCalledWith("/pack/cobranza/clients/c-1/loans", expect.objectContaining({ valor: 1000 }));

    await registrarPago(api, "l-1", { valor: 250, metodo_pago: "efectivo", cuota_id: "q-1" });
    expect(post).toHaveBeenCalledWith("/pack/cobranza/loans/l-1/payments", {
      valor: 250,
      metodo_pago: "efectivo",
      cuota_id: "q-1",
    });

    await registrarAbono(api, "l-1", { valor: 100, metodo_pago: "nequi" });
    expect(post).toHaveBeenCalledWith("/pack/cobranza/loans/l-1/credits", {
      valor: 100,
      metodo_pago: "nequi",
    });
  });

  it("actualiza una cuota y elimina un abono", async () => {
    const { api, put, del } = apiFalsa();
    await actualizarCuota(api, "q-1", { valor: 300, vence: "2026-11-01", estatus: "pendiente" });
    expect(put).toHaveBeenCalledWith("/pack/cobranza/installments/q-1", {
      valor: 300,
      vence: "2026-11-01",
      estatus: "pendiente",
    });
    await eliminarAbono(api, "ab-1");
    expect(del).toHaveBeenCalledWith("/pack/cobranza/credits/ab-1");
  });
});
