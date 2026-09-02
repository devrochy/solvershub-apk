import { ClienteTarjetaPublic } from "../../types/cobrador";
import {
  cambioClientePayload,
  camposCambiados,
  dedupeKeyCambioCliente,
  edicionDesdeTarjeta,
} from "./cambio-cliente";

const tarjeta: ClienteTarjetaPublic = {
  clienteId: 7,
  rutaId: 6,
  nombre: "Juan",
  negocio: "Tienda",
  telefonoWhatsapp: "+59170000001",
  color: "rojo",
  fotoUrl: null,
  tipoPago: "diario",
  saldoPendiente: 100,
  diasMora: 0,
};

describe("cambio-cliente (payload del evento offline)", () => {
  it("edicionDesdeTarjeta prellena nombre, negocio y WhatsApp", () => {
    expect(edicionDesdeTarjeta(tarjeta)).toEqual({
      nombre: "Juan",
      negocio: "Tienda",
      telefonoWhatsapp: "+59170000001",
    });
  });

  it("cambioClientePayload arma {clienteId, input}", () => {
    const input = { nombre: "Juan Carlos" };
    expect(cambioClientePayload(7, input)).toEqual({
      clienteId: 7,
      input,
    });
  });

  it("dedupeKeyCambioCliente es estable por cliente", () => {
    expect(dedupeKeyCambioCliente(7)).toBe("cambio_cliente-7");
    expect(dedupeKeyCambioCliente(7)).toBe(dedupeKeyCambioCliente(7));
  });

  it("camposCambiados devuelve solo lo que difiere del original", () => {
    const original = edicionDesdeTarjeta(tarjeta);
    const edicion = { ...original, nombre: "Juan Carlos" };

    expect(camposCambiados(edicion, original)).toEqual({ nombre: "Juan Carlos" });
  });

  it("camposCambiados devuelve {} si no hay cambios", () => {
    const original = edicionDesdeTarjeta(tarjeta);

    expect(camposCambiados({ ...original }, original)).toEqual({});
  });
});