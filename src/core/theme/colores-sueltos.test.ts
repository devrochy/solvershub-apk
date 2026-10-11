import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, sep } from "path";

import pendientes from "./colores-pendientes.json";

// Colores sueltos fuera del tema (HU-DS-02, SPEC-29): un hex, un rgb()/rgba() o un
// `shColor.*` en una pantalla o componente salta el tema y rompe el contraste en
// claro u oscuro. La app arrastra deuda, así que se registra en
// `colores-pendientes.json` y la lista **solo puede bajar**:
//   - un archivo que no está en la lista no puede tener colores sueltos;
//   - un archivo de la lista no puede tener más de los registrados;
//   - si un archivo baja, hay que bajar su número (o quitarlo) en la lista.
// Se limpia al migrar pantallas al kit de `src/shared/ui` (HU-DS-10, HU-DS-11).

const RAIZ = join(__dirname, "..", "..", "..");
const SRC = join(RAIZ, "src");

/** Únicos lugares donde un color puede escribirse a mano. */
const PERMITIDOS = [
  "src/core/theme/", // tokens generados y roles del tema
  "src/shared/ui/tema.ts", // mapeo del kit a los tokens (HU-DS-09)
  "src/core/api/schema.d.ts",
];

const PATRONES = [
  /["'`]#[0-9a-fA-F]{3,8}["'`]/g, // "#fff", '#0B1733'
  /["'`]rgba?\(/g, // "rgba(0, 0, 0, 0.4)"
  /\bshColor\./g, // shColor.navy["700"]
];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

function contar(texto: string): number {
  return PATRONES.reduce((total, patron) => total + (texto.match(patron)?.length ?? 0), 0);
}

const actuales: Record<string, number> = {};
for (const ruta of archivos(SRC)) {
  const rel = relative(RAIZ, ruta).split(sep).join("/");
  if (PERMITIDOS.some((p) => rel === p || rel.startsWith(p))) continue;
  const n = contar(readFileSync(ruta, "utf8"));
  if (n > 0) actuales[rel] = n;
}

const registrados = pendientes as Record<string, number>;

describe("colores sueltos fuera del tema", () => {
  it("ningún archivo nuevo escribe colores a mano", () => {
    const nuevos = Object.keys(actuales).filter((rel) => !(rel in registrados));
    expect(nuevos).toEqual([]);
  });

  it("ningún archivo pendiente suma colores sueltos", () => {
    const suben = Object.entries(actuales)
      .filter(([rel, n]) => rel in registrados && n > registrados[rel])
      .map(([rel, n]) => `${rel}: ${registrados[rel]} → ${n}`);
    expect(suben).toEqual([]);
  });

  it("la lista de pendientes está al día (solo baja)", () => {
    const bajaron = Object.entries(registrados)
      .filter(([rel, n]) => (actuales[rel] ?? 0) < n)
      .map(([rel, n]) => `${rel}: ${n} → ${actuales[rel] ?? 0} (actualiza colores-pendientes.json)`);
    expect(bajaron).toEqual([]);
  });
});
