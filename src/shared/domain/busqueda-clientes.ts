import type { ClienteGestorPublic } from "@shared/types/gestor";

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Filtra clientes por texto libre, buscando en nombre, apellido, negocio,
 * teléfono y número de documento. Insensible a mayúsculas y acentos. Con texto
 * vacío (o solo espacios) devuelve la lista completa.
 */
export function filtrarPorTexto(
  clientes: ClienteGestorPublic[],
  texto: string,
): ClienteGestorPublic[] {
  const consulta = normalizar(texto.trim());
  if (!consulta) {
    return clientes;
  }
  return clientes.filter((cliente) => {
    const campos = [
      cliente.nombre,
      cliente.apellido,
      cliente.negocio ?? "",
      cliente.telefonoWhatsapp,
      cliente.numeroDocumento ?? "",
    ];
    return campos.some((campo) => normalizar(campo).includes(consulta));
  });
}
