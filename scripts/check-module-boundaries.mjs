#!/usr/bin/env node
/* Verificación de fronteras entre módulos (ADR-APP-01, SPEC-25).
 *
 * Reglas:
 * - `src/modules/<m>/**`  → solo puede importar de `src/modules/<m>/`,
 *   `src/core/`, `src/shared/`, `src/data/` y de paquetes (imports sin ruta).
 * - `src/core/`, `src/shared/`, `src/data/` (capas de plataforma) → pueden
 *   importar entre ellas y de paquetes, pero NO de módulos ni de carpetas
 *   legacy de `src/`.
 * - `src/navigation/` y `src/app/` (composición) → pueden importar de todo
 *   `src/`.
 * - Carpetas legacy (`src/screens`, `src/components`, `src/features`,
 *   `src/offline`, `src/session`, `src/api`, `src/types`) → exentas mientras
 *   dure la migración a módulos (HU-APP-07): solo se avisa su conteo.
 *
 * Salida: exit 1 ante cualquier violación (rompe `npm run check` y CI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const PLATFORM_DIRS = ["core", "shared", "data"];
const COMPOSER_DIRS = ["navigation", "app"];
const LEGACY_DIRS = ["screens", "components", "features", "offline", "session", "api", "types"];

const IMPORT_RE = /(?:from\s+|import\s+)\s*["']([^"']+)["']/g;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function capaDe(rel) {
  const parts = rel.split(path.sep);
  if (parts[0] === "modules") {
    return { tipo: "modulo", dir: parts.slice(0, 2).join("/") };
  }
  if (PLATFORM_DIRS.includes(parts[0])) return { tipo: "plataforma" };
  if (COMPOSER_DIRS.includes(parts[0])) return { tipo: "composicion" };
  if (LEGACY_DIRS.includes(parts[0])) return { tipo: "legacy" };
  return { tipo: "legacy" };
}

const archivos = walk(SRC);
const violaciones = [];
let legacyVistos = 0;
const ALIAS_PLATAFORMA = ["@core/", "@shared/", "@data/", "@/"];

for (const archivo of archivos) {
  const rel = path.relative(SRC, archivo).split(path.sep).join("/");
  const capa = capaDe(rel);
  if (capa.tipo === "legacy") {
    legacyVistos++;
    continue;
  }

  const texto = fs.readFileSync(archivo, "utf8");
  for (const m of texto.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!spec.startsWith(".") && !spec.startsWith("@")) continue; // paquete

    let destino;
    if (ALIAS_PLATAFORMA.some((a) => spec.startsWith(a))) {
      destino = { tipo: "plataforma" };
    } else {
      const resolved = path.normalize(path.join(path.dirname(archivo), spec));
      const drel = path.relative(SRC, resolved).split(path.sep).join("/");
      destino = capaDe(drel);
    }

    if (capa.tipo === "composicion") continue;
    if (capa.tipo === "modulo") {
      const destinoOk =
        destino.tipo === "plataforma" ||
        (destino.tipo === "modulo" && destino.dir === capa.dir);
      if (!destinoOk) {
        violaciones.push(`${rel}: importa "${spec}" (fuera de su módulo o de core/shared/data)`);
      }
      continue;
    }
    if (destino.tipo === "modulo" || destino.tipo === "legacy") {
      violaciones.push(`${rel}: importa "${spec}" (capa core/shared/data no puede importar de módulos ni legacy)`);
    }
  }
}

if (legacyVistos > 0) {
  console.log(`modulo-boundaries: ${legacyVistos} archivos legacy exentos (pendientes de HU-APP-07)`);
}

if (violaciones.length > 0) {
  console.error("Violaciones de fronteras entre módulos (ADR-APP-01):");
  for (const v of violaciones) console.error("  - " + v);
  process.exit(1);
}
console.log("modulo-boundaries: OK");
