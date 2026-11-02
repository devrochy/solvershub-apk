import type { ClienteAdmin } from "@core/api/admin";
import type { components } from "@core/api/schema";

export type OrderOut = components["schemas"]["OrderOut"];
// HU-CRM-01: `image_url` llega con agent-core#504; se quita el agregado al regenerar schema.d.ts.
export type ProductOut = components["schemas"]["ProductOut"] & { image_url?: string | null };
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

// ---------------- HU-APP-20 · escrituras móviles ----------------

export async function crearProducto(
  api: ClienteAdmin,
  datos: { name: string; price?: number; image_url?: string },
): Promise<void> {
  await api.post("/pack/commerce/products", {
    name: datos.name,
    price: datos.price,
    ...(datos.image_url ? { image_url: datos.image_url } : {}),
  });
}

/**
 * Edición desde la app (HU-CRM-01): nombre, precio y foto. La API reemplaza descripción,
 * categoría y stock con lo que reciba, así que se reenvían los del producto tal cual.
 * `image_url: ""` quita la foto.
 */
export async function editarProducto(
  api: ClienteAdmin,
  producto: ProductOut,
  cambios: { name: string; price?: number; image_url: string },
): Promise<void> {
  const variante = producto.variants[0];
  await api.post("/pack/commerce/products", {
    product_id: producto.id,
    name: cambios.name,
    description: producto.description,
    category_id: producto.category_id,
    sku: variante?.sku ?? "",
    price: cambios.price ?? producto.price,
    stock: variante?.stock ?? 0,
    image_url: cambios.image_url,
  });
}

export async function crearCategoria(
  api: ClienteAdmin,
  datos: { name: string },
): Promise<void> {
  await api.post("/pack/commerce/categories", { name: datos.name });
}

export async function crearPromocion(
  api: ClienteAdmin,
  datos: { type: string },
): Promise<void> {
  await api.post("/pack/commerce/promotions", { type: datos.type, active: true });
}

// ---------------- Cierre de réplica: resumen del comercio ----------------

export interface KpiComercio {
  leads: number;
  products: number;
  promotions: number;
  orders: number;
}

export async function cargarResumenComercio(api: ClienteAdmin): Promise<KpiComercio> {
  const res = await api.get<{ kpi: KpiComercio }>("/pack/commerce/dashboard");
  return res.kpi;
}

// ---------------------------------------------------------------- avisos de seguimiento (HU-CRM-22)
/** Ajustes del pack de Ventas que gobiernan los recordatorios de seguimiento y el resumen diario. */
export interface AvisosDeSeguimiento {
  seguimiento_recordatorios: boolean;
  seguimiento_resumen_diario: boolean;
  /** Hora del negocio (0-19) desde la que sale el resumen. */
  seguimiento_resumen_hora: number;
}

export const HORA_DEL_RESUMEN_MAX = 19;

interface ConfigPlugin {
  plugin_id: string;
  values: Record<string, unknown>;
}

/** Lee los valores completos de la configuración: el guardado necesita todos para no reponer defaults. */
export async function cargarConfigDeVentas(api: ClienteAdmin): Promise<Record<string, unknown>> {
  const config = await api.get<ConfigPlugin>("/admin/plugins/pack_commerce/config");
  return config.values ?? {};
}

export function avisosDeConfig(values: Record<string, unknown>): AvisosDeSeguimiento {
  const hora = Number(values.seguimiento_resumen_hora);
  return {
    seguimiento_recordatorios: values.seguimiento_recordatorios !== false,
    seguimiento_resumen_diario: values.seguimiento_resumen_diario !== false,
    seguimiento_resumen_hora: Number.isInteger(hora) && hora >= 0 && hora <= HORA_DEL_RESUMEN_MAX ? hora : 8,
  };
}

/** Guarda un ajuste sobre la configuración completa leída (los secretos los conserva el servidor). */
export async function guardarAvisosDeSeguimiento(
  api: ClienteAdmin,
  actual: Record<string, unknown>,
  cambio: Partial<AvisosDeSeguimiento>,
): Promise<Record<string, unknown>> {
  const config = await api.put<ConfigPlugin>("/admin/plugins/pack_commerce/config", { values: { ...actual, ...cambio } });
  return config.values ?? { ...actual, ...cambio };
}

/** «8:00 a. m.», «12:00 p. m.» (0 = 12:00 a. m.). */
export function textoDeHora(hora: number): string {
  const h12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${h12}:00 ${hora < 12 ? "a. m." : "p. m."}`;
}
