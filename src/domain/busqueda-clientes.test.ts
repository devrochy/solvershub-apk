import { filtrarPorTexto } from "./busqueda-clientes";
import type { ClienteGestorPublic } from "../types/gestor";

function cliente(overrides: Partial<ClienteGestorPublic>): ClienteGestorPublic {
  return {
    id: 1,
    carteraId: 1,
    nombre: "Juan",
    apellido: "Perez",
    negocio: "Tienda Central",
    telefonoWhatsapp: "+5917000111",
    latitud: 0,
    longitud: 0,
    latitudDomicilio: null,
    longitudDomicilio: null,
    topeMaximoDeuda: null,
    estatus: "activo",
    colorRiesgo: "blanco",
    fotoUrl: null,
    tipoDocumento: "ci",
    numeroDocumento: "1234567",
    numPrestamos: 1,
    diasMora: 0,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const clientes = [
  cliente({ id: 1, nombre: "Juan", apellido: "Perez", negocio: "Tienda Central", telefonoWhatsapp: "+5917000111", numeroDocumento: "1234567" }),
  cliente({ id: 2, nombre: "Ana", apellido: "Ríos", negocio: "Panadería", telefonoWhatsapp: "+5917000222", numeroDocumento: "7654321" }),
];

describe("filtrarPorTexto", () => {
  it("sin texto devuelve todos", () => {
    expect(filtrarPorTexto(clientes, "")).toHaveLength(2);
    expect(filtrarPorTexto(clientes, "   ")).toHaveLength(2);
  });

  it("filtra por nombre (insensible a mayúsculas)", () => {
    expect(filtrarPorTexto(clientes, "juan").map((c) => c.id)).toEqual([1]);
    expect(filtrarPorTexto(clientes, "ANA").map((c) => c.id)).toEqual([2]);
  });

  it("filtra por apellido, negocio, teléfono y documento", () => {
    expect(filtrarPorTexto(clientes, "perez").map((c) => c.id)).toEqual([1]);
    expect(filtrarPorTexto(clientes, "panaderia").map((c) => c.id)).toEqual([2]);
    expect(filtrarPorTexto(clientes, "000222").map((c) => c.id)).toEqual([2]);
    expect(filtrarPorTexto(clientes, "1234567").map((c) => c.id)).toEqual([1]);
  });

  it("devuelve vacío si no hay coincidencias", () => {
    expect(filtrarPorTexto(clientes, "zzz")).toHaveLength(0);
  });
});
