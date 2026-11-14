import type { ClienteAdmin } from "@core/api/admin";

export type ClienteRef = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  canal: string | null;
};

export type SuscripcionItem = {
  id: string;
  cliente: ClienteRef;
  plan: string;
  estado: string;
  periodicidad: string;
  valor_periodo: number;
  moneda: string;
  proximo_cargo: string | null;
  deuda: number;
  en_mora: number;
  dias_mora: number | null;
};

export type CargoItem = {
  id: string;
  suscripcion_id: string;
  cliente: ClienteRef | null;
  plan: string | null;
  periodo: string;
  monto: number;
  moneda: string | null;
  estado: string;
  fecha_vencimiento: string | null;
  dias_mora: number | null;
};

export type Metricas = {
  moneda: string;
  mrr: number;
  activas: number;
  en_prueba: number;
  pausadas: number;
  vencidas: number;
  altas_mes: number;
  bajas_mes: number;
  mora: { cargos: number; monto: number };
};

export type Pagina<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
};

export function cargarMetricas(api: ClienteAdmin) {
  return api.get<Metricas>("/pack/pack_subscriptions/metricas");
}

export function cargarSuscripciones(api: ClienteAdmin) {
  return api.get<Pagina<SuscripcionItem>>(
    "/pack/pack_subscriptions/suscripciones?page_size=20",
  );
}

export function cargarCargos(api: ClienteAdmin) {
  return api.get<Pagina<CargoItem>>("/pack/pack_subscriptions/cargos?page_size=20");
}

export function dinero(valor: number, moneda = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}

export function fechaCorta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
