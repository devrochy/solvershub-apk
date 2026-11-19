import type { ClienteAdmin } from "@core/api/admin";

export type ModuloDatosDePrueba = "ventas" | "agenda" | "cobranza" | "suscripciones";

export type LoteDePrueba = {
  lote_id: string;
  modo: string;
  origen: "llm" | "plantilla";
  creado_en: string;
  conteos: Record<string, number>;
};

export type EstadoDatosDePruebaModulo = {
  modulo: ModuloDatosDePrueba;
  titulo: string;
  disponible: boolean;
  motivo: string | null;
  falta_descripcion: boolean;
  lote: LoteDePrueba | null;
};

export type LoteGenerado = LoteDePrueba & {
  motivo_plantilla: "proveedor" | "formato" | null;
  retirados: number;
};

export function cargarDatosDePrueba(api: ClienteAdmin, modulo: ModuloDatosDePrueba) {
  return api.get<EstadoDatosDePruebaModulo>(`/admin/datos-de-prueba/${modulo}`);
}

export function generarDatosDePrueba(api: ClienteAdmin, modulo: ModuloDatosDePrueba) {
  return api.post<LoteGenerado>(`/admin/datos-de-prueba/${modulo}`);
}

export function borrarDatosDePrueba(api: ClienteAdmin, modulo: ModuloDatosDePrueba) {
  return api.del<{ retirados: number }>(`/admin/datos-de-prueba/${modulo}`);
}

export const MODULOS_DE_PRUEBA: Record<
  ModuloDatosDePrueba,
  { titulo: string; descripcion: string; aviso: string }
> = {
  ventas: {
    titulo: "Ventas",
    descripcion: "Productos, precios y categorías para probar el catálogo.",
    aviso: "Se generan según la descripción de tu negocio. Lo que creaste a mano no cambia.",
  },
  agenda: {
    titulo: "Agenda",
    descripcion: "Tipos de cita y citas próximas para probar la agenda.",
    aviso: "Se generan según la descripción de tu negocio. Lo que creaste a mano no cambia.",
  },
  cobranza: {
    titulo: "Cobranza",
    descripcion: "Una cartera con clientes al día, en mora y sin préstamo.",
    aviso: "Se generan según la descripción de tu negocio. Lo que creaste a mano no cambia.",
  },
  suscripciones: {
    titulo: "Suscripciones",
    descripcion: "Planes, clientes suscritos y cobros de ejemplo.",
    aviso: "Se generan según la descripción de tu negocio. Lo que creaste a mano no cambia.",
  },
};

const TIPOS: [string, string, string][] = [
  ["producto", "producto", "productos"],
  ["categoria", "categoría", "categorías"],
  ["tipo", "tipo de cita", "tipos de cita"],
  ["cita", "cita", "citas"],
  ["cartera", "cartera", "carteras"],
  ["cliente", "cliente", "clientes"],
  ["prestamo", "préstamo", "préstamos"],
  ["suscripcion", "suscripción", "suscripciones"],
  ["cargo", "cargo", "cargos"],
];

export function conteoLegible(conteos: Record<string, number>): string {
  const partes = TIPOS.filter(([k]) => (conteos[k] ?? 0) > 0).map(([k, uno, varios]) => {
    const n = conteos[k] ?? 0;
    return `${n} ${n === 1 ? uno : varios}`;
  });
  if (partes.length === 0) return "sin registros nuevos";
  if (partes.length === 1) return partes[0]!;
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

export function resumenDelLote(lote: LoteGenerado): string {
  const que = conteoLegible(lote.conteos);
  if (lote.origen === "llm") return `Listo: ${que}, generados con IA según tu negocio.`;
  const porque =
    lote.motivo_plantilla === "formato"
      ? "la IA no devolvió datos válidos"
      : "la IA no respondió";
  return `Listo: ${que}, con la plantilla de ejemplo porque ${porque}.`;
}
