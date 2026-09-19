export type Tema = "claro" | "oscuro";

export interface ColoresTema {
  fondo: string;
  tarjeta: string;
  texto: string;
  textoSuave: string;
  borde: string;
  /** Banda del header / marca. */
  primario: string;
  sobrePrimario: string;
  /** Acento para texto/enlaces (contrasta con el fondo en ambos modos). */
  acento: string;
  /** Fondo de un ítem activo. */
  activoSuave: string;
  peligro: string;
}

export const COLORES: Record<Tema, ColoresTema> = {
  claro: {
    fondo: "#f8fafc",
    tarjeta: "#ffffff",
    texto: "#0f172a",
    textoSuave: "#64748b",
    borde: "#e2e8f0",
    primario: "#172f6c",
    sobrePrimario: "#ffffff",
    acento: "#172f6c",
    activoSuave: "#eef2ff",
    peligro: "#dc2626",
  },
  oscuro: {
    fondo: "#0f172a",
    tarjeta: "#1e293b",
    texto: "#f1f5f9",
    textoSuave: "#94a3b8",
    borde: "#334155",
    primario: "#111c3f",
    sobrePrimario: "#e2e8f0",
    acento: "#93c5fd",
    activoSuave: "#1e3a8a",
    peligro: "#f87171",
  },
};
