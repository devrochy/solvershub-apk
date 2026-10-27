import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as kit from "./index";

// Reglas transversales del kit (SPEC-29, HU-DS-09): todo sobre tokens, nada de
// hex sueltos, marca Montserrat/Inter y fronteras de ADR-APP-01.

const DIR = __dirname;
const fuentes = readdirSync(DIR)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== "test-utils.ts")
  .map((f) => ({ archivo: f, texto: readFileSync(join(DIR, f), "utf8") }));
const catalogo = readFileSync(join(DIR, "catalogo", "CatalogoScreen.tsx"), "utf8");

describe("kit shared/ui", () => {
  it("exporta los componentes de la HU", () => {
    for (const nombre of [
      "Button",
      "Drawer",
      "IconButton",
      "Field",
      "TextField",
      "Badge",
      "Avatar",
      "Skeleton",
      "EmptyState",
      "Toast",
      "ToastProvider",
      "useToast",
      "Sheet",
      "ListItem",
      "NavGroup",
      "RecordRow",
      "KpiTile",
      "PageHeader",
      "SyncStatus",
      "Stepper",
      "Checkbox",
      "Switch",
      "RadioGroup",
    ]) {
      expect({ nombre, existe: typeof (kit as Record<string, unknown>)[nombre] }).toEqual({
        nombre,
        existe: "function",
      });
    }
  });

  it("no tiene colores hex sueltos (todo sale de los tokens)", () => {
    for (const { archivo, texto } of [...fuentes, { archivo: "catalogo", texto: catalogo }]) {
      expect({ archivo, hex: texto.match(/#[0-9a-fA-F]{3,8}\b/g) }).toEqual({ archivo, hex: null });
      expect({ archivo, rgba: /rgba?\(/.test(texto) }).toEqual({ archivo, rgba: false });
    }
  });

  it("solo el mapeo del tema toca la paleta base (shColor)", () => {
    for (const { archivo, texto } of fuentes) {
      if (archivo === "tema.ts") continue;
      expect({ archivo, usaShColor: texto.includes("shColor") }).toEqual({ archivo, usaShColor: false });
    }
  });

  it("usa la tipografía de marca y nunca Roboto", () => {
    for (const { archivo, texto } of [...fuentes, { archivo: "catalogo", texto: catalogo }]) {
      expect({ archivo, roboto: /roboto/i.test(texto) }).toEqual({ archivo, roboto: false });
    }
  });

  it("respeta las fronteras: shared no importa de módulos", () => {
    for (const { archivo, texto } of [...fuentes, { archivo: "catalogo", texto: catalogo }]) {
      expect({ archivo, modulo: /from\s+["'][^"']*modules\//.test(texto) }).toEqual({
        archivo,
        modulo: false,
      });
    }
  });
});
