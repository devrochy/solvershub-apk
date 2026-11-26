import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

/**
 * Los valores que Android acepta en `accessibilityRole` (`AccessibilityRole` de `ViewAccessibility.js`, RN 0.88).
 * El tipo de TypeScript termina en `| string`, así que `npm run typecheck` deja pasar cualquiera; en Android uno
 * desconocido revienta al montar la vista («Invalid accessibility role value: status», bienvenida, 2026-11-26).
 * Para un aviso que se anuncia se usa `accessibilityLiveRegion`, no un rol.
 */
const VALIDOS = new Set([
  "none",
  "button",
  "dropdownlist",
  "togglebutton",
  "link",
  "search",
  "image",
  "keyboardkey",
  "text",
  "adjustable",
  "imagebutton",
  "header",
  "summary",
  "alert",
  "checkbox",
  "combobox",
  "menu",
  "menubar",
  "menuitem",
  "progressbar",
  "radio",
  "radiogroup",
  "scrollbar",
  "spinbutton",
  "switch",
  "tab",
  "tabbar",
  "tablist",
  "timer",
  "list",
  "toolbar",
  "grid",
  "pager",
  "scrollview",
  "horizontalscrollview",
  "viewgroup",
  "webview",
  "drawerlayout",
  "slidingdrawer",
  "iconmenu",
]);

const RAIZ = join(__dirname, "..", "..");

function archivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [ruta] : [];
  });
}

describe("accessibilityRole", () => {
  it("solo usa roles que Android acepta", () => {
    const invalidos: string[] = [];
    for (const archivo of archivos(RAIZ)) {
      const texto = readFileSync(archivo, "utf8");
      for (const m of texto.matchAll(/accessibilityRole(?:=|:\s*)["']([^"']+)["']/g)) {
        if (!VALIDOS.has(m[1])) invalidos.push(`${relative(RAIZ, archivo)}: ${m[1]}`);
      }
    }
    expect(invalidos).toEqual([]);
  });
});
