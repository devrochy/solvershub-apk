import type { FeedbackCatalogo, FeedbackReporte, FeedbackResumen } from "../api";

export const CATALOGO: FeedbackCatalogo = {
  tipos: [
    { clave: "error", etiqueta: "Error" },
    { clave: "mejora", etiqueta: "Mejora" },
    { clave: "idea", etiqueta: "Idea" },
  ],
  areas: [
    { clave: "agenda", etiqueta: "Agenda" },
    { clave: "otra", etiqueta: "Otra" },
  ],
  limites: { max_adjuntos: 5, max_bytes_por_archivo: 8388608, max_bytes_total: 26214400, mimetypes: ["image/jpeg", "image/png", "application/pdf"] },
};

export function resumen(parcial: Partial<FeedbackResumen> = {}): FeedbackResumen {
  return {
    id: "r-1",
    autor_admin_id: "a-1",
    tipo: "error",
    area: "agenda",
    titulo: "No carga la agenda",
    descripcion: "La agenda del martes no carga.",
    estado: "recibido",
    motivo_codigo: null,
    motivo: null,
    creditos_otorgados: null,
    created_at: "2026-11-27T15:00:00Z",
    decidido_en: null,
    adjuntos_total: 0,
    ...parcial,
  };
}

export function reporte(parcial: Partial<FeedbackReporte> = {}): FeedbackReporte {
  const { adjuntos_total: _total, ...base } = resumen();
  return { ...base, adjuntos: [], ...parcial };
}
