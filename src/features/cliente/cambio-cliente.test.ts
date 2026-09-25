import { ClienteTarjetaPublic } from "../../types/gestor";
import {
  cambioClientePayload,
  camposCambiados,
  dedupeKeyCambioCliente,
  edicionDesdeTarjeta,
} from "./cambio-cliente";

const tarjeta: ClienteTarjetaPublic = {
  clienteId: "7",
  carteraId: "6",
  nombre: "Juan",
  negocio: "Tienda",
  telefonoWhatsapp: "+59170000001",
  color: "rojo",
  fotoUrl: null,
  tipoDocumento: "ci",
  numeroDocumento: "1234567",
  tipoPago: "diario",
  saldoPendiente: 100,
  diasMora: 0,
};

describe("cambio-cliente (payload del evento offline)", () => {
  it("edicionDesdeTarjeta prellena nombre, negocio, WhatsApp y documento", () => {
    expect(edicionDesdeTarjeta(tarjeta)).toEqual({
      nombre: "Juan",
      apellido: "",
      negocio: "Tienda",
      telefonoWhatsapp: "+59170000001",
      tipoDocumento: "ci",
      numeroDocumento: "1234567",
    });
  });

  it("edicionDesdeTarjeta deriva el apellido de la última palabra del nombre", () => {
    const tarjetaCompleta: ClienteTarjetaPublic = {
      ...tarjeta,
      nombre: "Juan Carlos Perez",
    };
    expect(edicionDesdeTarjeta(tarjetaCompleta)).toEqual({
      nombre: "Juan Carlos Perez",
      apellido: "Carlos Perez",
      negocio: "Tienda",
      telefonoWhatsapp: "+59170000001",
      tipoDocumento: "ci",
      numeroDocumento: "1234567",
    });
  });

  it("camposCambiados incluye latitud/longitud y domicilio cuando difieren", () => {
    const original = edicionDesdeTarjeta(tarjeta);
    const edicion = {
      ...original,
      latitud: -17.78,
      longitud: -63.18,
      latitudDomicilio: -17.79,
      longitudDomicilio: -63.19,
    };

    expect(camposCambiados(edicion, original)).toEqual({
      latitud: -17.78,
      longitud: -63.18,
      latitudDomicilio: -17.79,
      longitudDomicilio: -63.19,
    });
  });

  it("cambioClientePayload arma {clienteId, input}", () => {
    const input = { nombre: "Juan Carlos" };
    expect(cambioClientePayload("7", input)).toEqual({
      clienteId: "7",
      input,
    });
  });

  it("dedupeKeyCambioCliente es estable por cliente", () => {
    expect(dedupeKeyCambioCliente("7")).toBe("cambio_cliente-7");
    expect(dedupeKeyCambioCliente("7")).toBe(dedupeKeyCambioCliente("7"));
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

  it("camposCambiados incluye el documento cuando cambia el tipo o el número", () => {
    const original = edicionDesdeTarjeta(tarjeta);
    const edicion = {
      ...original,
      tipoDocumento: "nit" as const,
      numeroDocumento: "7654321",
    };

    expect(camposCambiados(edicion, original)).toEqual({
      tipoDocumento: "nit",
      numeroDocumento: "7654321",
    });
  });
});