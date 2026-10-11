import { readFileSync } from "fs";
import { join } from "path";
import { shDensity, shMotion, shTheme, shType } from "./tokens";

// Tokens v1.4 (SPEC-29, HU-DS-01): lo que la app recibe de la marca tiene que servir
// tal cual en pantalla, sin que cada componente vuelva a decidir colores o tamaños.

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(n >> 16) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const ESTADOS = ["statusSuccessFg", "statusWarningFg", "statusDangerFg", "statusInfoFg"] as const;

describe("tokens v1.4 en la app", () => {
  it.each(["light", "dark"] as const)("el texto de estado cumple AA sobre fondo y tarjeta (%s)", (tema) => {
    const t = shTheme[tema];
    for (const estado of ESTADOS) {
      for (const fondo of [t.bg, t.surface, t.surface2]) {
        expect({ estado, fondo, ok: contraste(t[estado], fondo) >= 4.5 }).toEqual({ estado, fondo, ok: true });
      }
    }
  });

  it.each(["light", "dark"] as const)("las series de datos se distinguen de la tarjeta (%s)", (tema) => {
    const t = shTheme[tema];
    for (const serie of [t.dataCat1, t.dataCat2, t.dataCat3, t.dataCat4, t.dataSingle]) {
      expect(contraste(serie, t.surface)).toBeGreaterThanOrEqual(3);
    }
  });

  it("cada familia de la escala tipográfica es una fuente que App.tsx carga", () => {
    const app = readFileSync(join(__dirname, "..", "..", "..", "App.tsx"), "utf8");
    const cargadas = /useFonts\(\{([^}]*)\}/.exec(app)?.[1] ?? "";
    for (const [rol, estilo] of Object.entries(shType)) {
      if (estilo.fontFamily === "monospace") continue;
      expect({ rol, cargada: cargadas.includes(estilo.fontFamily) }).toEqual({ rol, cargada: true });
    }
  });

  it("las duraciones crecen y las curvas sirven para Easing.bezier", () => {
    const { instant, fast, base, slow } = shMotion.duration;
    expect(instant < fast && fast < base && base < slow).toBe(true);
    for (const curva of Object.values(shMotion.easing)) {
      expect(curva).toHaveLength(4);
    }
  });

  it("los controles táctiles miden al menos 48 dp", () => {
    expect(shDensity.controlLg).toBeGreaterThanOrEqual(48);
  });
});
