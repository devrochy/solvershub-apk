/**
 * Mapeo del tema activo a los roles que usa el kit (SPEC-29, HU-DS-09).
 *
 * Es el ÚNICO archivo del kit que toca la paleta base (`shColor`): los
 * componentes leen solo `useKit()`, que devuelve los tokens semánticos del tema
 * activo (`shTheme.light|dark`) más unos pocos rellenos derivados (botón
 * primario, peligro, ripple, esqueleto y el tono `accent`). Cambiar la marca
 * toca `tokens.json` y nada de los componentes.
 */
import { useMemo } from "react";
import { conAlfa } from "@core/theme/alpha";
import type { Tema } from "@core/theme/theme";
import { useTheme } from "@core/theme/theme-context";
import { shColor, shTheme } from "@core/theme/tokens";

/** Tokens semánticos de un tema (mismas claves en claro y oscuro). */
export type ColoresKit = { [K in keyof typeof shTheme.light]: string };

/** Tonos de estado y de énfasis, con los mismos nombres que el panel. */
export type Tono = "neutral" | "info" | "success" | "warning" | "danger" | "accent";
/** Tonos que comunican un estado: con ellos el ícono es obligatorio. */
export type TonoEstado = "info" | "success" | "warning" | "danger";

export interface ColoresTono {
  fg: string;
  bg: string;
  border: string;
}

export interface KitTema {
  tema: Tema;
  c: ColoresKit;
  relleno: {
    /** Botón primario (sin gradiente en la app) y su texto. */
    primario: string;
    sobrePrimario: string;
    /** Botón de peligro y su texto (AA con blanco en los dos temas). */
    peligro: string;
    sobrePeligro: string;
  };
  ripple: {
    /** Sobre superficies (secondary, ghost, filas). */
    superficie: string;
    /** Sobre rellenos de color (primary, danger). */
    relleno: string;
  };
  /** Fondo del esqueleto de carga (visible sobre `bg` y `surface`). */
  esqueleto: string;
  tonos: Record<Tono, ColoresTono>;
}

function crearKit(tema: Tema): KitTema {
  const oscuro = tema === "oscuro";
  const c: ColoresKit = oscuro ? shTheme.dark : shTheme.light;
  return {
    tema,
    c,
    relleno: {
      primario: shColor.blue["600"],
      sobrePrimario: shColor.white,
      peligro: shColor.status.light.danger,
      sobrePeligro: shColor.white,
    },
    ripple: {
      superficie: oscuro ? conAlfa(shColor.white, 0.12) : conAlfa(shColor.navy["900"], 0.1),
      relleno: conAlfa(shColor.white, 0.24),
    },
    esqueleto: oscuro ? c.surfaceRaised : c.border,
    tonos: {
      neutral: { fg: c.textMuted, bg: c.surface2, border: c.border },
      info: { fg: c.statusInfoFg, bg: c.statusInfoBg, border: c.statusInfoBorder },
      success: { fg: c.statusSuccessFg, bg: c.statusSuccessBg, border: c.statusSuccessBorder },
      warning: { fg: c.statusWarningFg, bg: c.statusWarningBg, border: c.statusWarningBorder },
      danger: { fg: c.statusDangerFg, bg: c.statusDangerBg, border: c.statusDangerBorder },
      accent: {
        fg: c.link,
        bg: conAlfa(shColor.cyan["400"], 0.12),
        border: conAlfa(shColor.cyan["400"], 0.32),
      },
    },
  };
}

const KITS: Record<Tema, KitTema> = { claro: crearKit("claro"), oscuro: crearKit("oscuro") };

/** Roles del kit para el tema activo (claro/oscuro de `ThemeProvider`). */
export function useKit(): KitTema {
  const { tema } = useTheme();
  return useMemo(() => KITS[tema], [tema]);
}

/** Igual que `useKit` pero fuera de React (tests, catálogo). */
export function kitDeTema(tema: Tema): KitTema {
  return KITS[tema];
}
