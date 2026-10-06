import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type OrderOut = components["schemas"]["OrderOut"];
export type ProductOut = components["schemas"]["ProductOut"];
export type PromotionOut = components["schemas"]["PromotionOut"];
export type CategoryOut = components["schemas"]["CategoryOut"];

export const ESTADOS_PEDIDO = ["abierto", "despachado", "entregado", "cancelado", "expirado"] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export async function cargarPedidos(api: ClienteAdmin): Promise<OrderOut[]> {
  return api.get<OrderOut[]>("/pack/commerce/orders");
}

export async function cambiarEstadoPedido(
  api: ClienteAdmin,
  id: string,
  status: EstadoPedido,
): Promise<void> {
  await api.post(`/pack/commerce/orders/${id}/status`, { status });
}

export async function cargarProductos(api: ClienteAdmin): Promise<ProductOut[]> {
  return api.get<ProductOut[]>("/pack/commerce/products");
}

export async function cargarPromociones(api: ClienteAdmin): Promise<PromotionOut[]> {
  return api.get<PromotionOut[]>("/pack/commerce/promotions");
}

export async function cargarCategorias(api: ClienteAdmin): Promise<CategoryOut[]> {
  return api.get<CategoryOut[]>("/pack/commerce/categories");
}

export async function alternarPromocion(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/pack/commerce/promotions/${id}/toggle`);
}
