/**
 * Filtra los clientes que deben re-precargarse (tarjeta + préstamos) según un
 * TTL. Evita repetir la precarga de todos los clientes del día en cada
 * re-fetch periódico (cada 30s), que generaba ~2N requests.
 */
export function clientesAprecargar<T extends { clienteId: string }>(
  clientes: T[],
  precargados: Map<string, number>,
  ahora: number,
  ttlMs: number,
): T[] {
  return clientes.filter((cliente) => {
    const ultimo = precargados.get(cliente.clienteId);
    return ultimo === undefined || ahora - ultimo >= ttlMs;
  });
}
