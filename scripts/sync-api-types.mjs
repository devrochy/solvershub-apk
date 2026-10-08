#!/usr/bin/env node
/* Genera los tipos de API desde el OpenAPI del backend (ADR-APP-06).
 *
 * Fuente: `docs/openapi.json` del repo del backend (../solvershub-backend), regenerado
 * por el backend con `python scripts/export_openapi.py` (ADR-0077). Salida commiteada:
 * src/core/api/schema.d.ts — el typecheck de la app la consume y check.sh falla si hay
 * diff sin regenerar.
 *
 * Se lee de la rama de integración del backend (`origin/develop` por defecto, override
 * con API_TYPES_REF), NO del árbol de trabajo: el checkout local del backend suele estar
 * en la rama de otra tarea y daba diffs falsos. Antes se hace `git fetch` de esa rama
 * (no toca el árbol de trabajo). Si git no está disponible, cae al archivo del árbol.
 *
 * Si no hay fuente (p. ej. CI sin el repo del backend clonado), avisa y deja el archivo
 * existente intacto.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BACKEND = path.join(ROOT, "..", "solvershub-backend");
const ARCHIVO = path.join(BACKEND, "docs", "openapi.json");
const SALIDA = path.join(ROOT, "src", "core", "api", "schema.d.ts");
const REF = process.env.API_TYPES_REF || "origin/develop";

/** Ruta a un openapi.json leído de REF en el backend, o null si no se pudo. */
function desdeRef() {
  try {
    const [remoto, ...rama] = REF.split("/");
    if (rama.length > 0) {
      execFileSync("git", ["-C", BACKEND, "fetch", "--quiet", remoto, rama.join("/")], {
        stdio: "ignore",
      });
    }
    const contenido = execFileSync("git", ["-C", BACKEND, "show", `${REF}:docs/openapi.json`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "api-types-")), "openapi.json");
    fs.writeFileSync(tmp, contenido);
    return tmp;
  } catch {
    return null;
  }
}

let fuente = desdeRef();
if (fuente) {
  console.log(`api:types: fuente ${REF}:docs/openapi.json del backend`);
} else if (fs.existsSync(ARCHIVO)) {
  fuente = ARCHIVO;
  console.warn(`api:types: no se pudo leer ${REF}; uso el árbol de trabajo del backend.`);
} else {
  console.warn("api:types: no existe ../solvershub-backend; se conserva el archivo actual.");
  process.exit(0);
}

const bin = path.join(ROOT, "node_modules", ".bin", "openapi-typescript");
try {
  execFileSync(bin, [fuente, "-o", SALIDA, "--alphabetize"], { stdio: "inherit" });
} finally {
  if (fuente !== ARCHIVO) {
    fs.rmSync(path.dirname(fuente), { recursive: true, force: true });
  }
}
console.log(`api:types: ${path.relative(ROOT, SALIDA)} generado.`);
