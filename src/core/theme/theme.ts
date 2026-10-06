/**
 * Paleta del APK derivada de los design tokens de SolversHub (DTCG).
 *
 * `tokens.ts` es una copia generada de `solvershub/brand/tokens/dist/theme.ts`:
 * la paleta se edita SOLO en `brand/tokens/tokens.json` y se regenera. Los roles
 * de abajo son la interfaz que consumen las pantallas (`ColoresTema`), mapeados a
 * los tokens semánticos del tema, así que cambiar la marca no toca componentes.
 *
 * Ver manual de marca §5 (color) y §5.5 (tema oscuro por defecto en producto).
 */
import { shColor, shTheme } from "./tokens";

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
    fondo: shTheme.light.bg,
    tarjeta: shTheme.light.surface,
    texto: shTheme.light.text,
    textoSuave: shTheme.light.textMuted,
    borde: shTheme.light.border,
    primario: shColor.navy["700"],
    sobrePrimario: shColor.white,
    acento: shTheme.light.link,
    activoSuave: shTheme.light.surfaceRaised,
    peligro: shColor.danger,
  },
  oscuro: {
    fondo: shTheme.dark.bg,
    tarjeta: shTheme.dark.surface,
    texto: shTheme.dark.text,
    textoSuave: shTheme.dark.textMuted,
    borde: shTheme.dark.border,
    primario: shTheme.dark.surface,
    sobrePrimario: shColor.white,
    acento: shTheme.dark.link,
    activoSuave: shTheme.dark.surface2,
    peligro: shColor.danger,
  },
};

// Tipografías de marca (Montserrat/Inter, manual §6): pendientes de instalar
// (@expo-google-fonts) junto con el pase de estilos. Hoy la APK usa Roboto.
