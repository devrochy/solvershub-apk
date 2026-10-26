import type { IconName, TonoEstado } from "@shared/ui";
import type { components } from "@core/api/schema";

export type NotificacionItem = components["schemas"]["NotificationItem"];
export type NotificacionPagina = components["schemas"]["NotificationPage"];
export type NotificacionDestino = components["schemas"]["NotificationTarget"];
export type NotificacionPreferencias = components["schemas"]["NotificationPreferences"];

/**
 * Clasificación visual (ADR-0167): el icono es de la CATEGORÍA y el color de la SEVERIDAD
 * (tonos del kit con AA por tema); lo urgente lleva además etiqueta de texto.
 */
export const CATEGORIAS = ["conversaciones", "ventas", "cobros", "agenda", "sistema"] as const;
export type Categoria = (typeof CATEGORIAS)[number];
export const SEVERIDADES = ["info", "success", "warning", "critical"] as const;
export type Severidad = (typeof SEVERIDADES)[number];

export const CATEGORIA: Record<Categoria, { label: string; icon: IconName }> = {
  conversaciones: { label: "Conversaciones", icon: "chat-bubble-outline" },
  ventas: { label: "Ventas", icon: "shopping-bag" },
  cobros: { label: "Cobros", icon: "payments" },
  agenda: { label: "Agenda", icon: "event" },
  sistema: { label: "Sistema", icon: "dns" },
};

export const SEVERIDAD: Record<Severidad, { label: string; icon: IconName; tono: TonoEstado }> = {
  info: { label: "Información", icon: "info-outline", tono: "info" },
  success: { label: "Éxito", icon: "check-circle-outline", tono: "success" },
  warning: { label: "Atención", icon: "warning-amber", tono: "warning" },
  critical: { label: "Urgente", icon: "error-outline", tono: "danger" },
};

export function categoriaDe(valor: string): Categoria {
  return (CATEGORIAS as readonly string[]).includes(valor) ? (valor as Categoria) : "sistema";
}

export function severidadDe(valor: string): Severidad {
  return (SEVERIDADES as readonly string[]).includes(valor) ? (valor as Severidad) : "info";
}

/** «hace 5 min», «hace 3 h», «ayer»… */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const min = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function inicioDelDia(f: Date): number {
  return new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
}

export function etiquetaDeDia(iso: string, ahora: Date = new Date()): string {
  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(new Date(iso))) / 86_400_000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

export interface GrupoDeDia {
  dia: string;
  items: NotificacionItem[];
}

export function agruparPorDia(items: NotificacionItem[], ahora: Date = new Date()): GrupoDeDia[] {
  const grupos: GrupoDeDia[] = [];
  for (const item of items) {
    const dia = etiquetaDeDia(item.created_at, ahora);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.dia === dia) ultimo.items.push(item);
    else grupos.push({ dia, items: [item] });
  }
  return grupos;
}

/** Opciones de silencio del push. `"manana"` = hasta las 8:00 del día siguiente. */
export const OPCIONES_SILENCIO: { label: string; minutos: number | "manana" }[] = [
  { label: "1 hora", minutos: 60 },
  { label: "8 horas", minutos: 480 },
  { label: "Hasta mañana", minutos: "manana" },
];

export function minutosHastaManana(ahora: Date = new Date()): number {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 8, 0, 0);
  return Math.max(1, Math.round((manana.getTime() - ahora.getTime()) / 60_000));
}
