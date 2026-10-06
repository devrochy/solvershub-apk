#!/usr/bin/env node
/* Genera los tipos de API desde el OpenAPI del backend (ADR-APP-06).
 *
 * Fuente: ../solvershub-backend/docs/openapi.json (regenerado por el backend
 * con `python scripts/export_openapi.py`, ADR-0077). Salida commiteada:
 * src/core/api/schema.d.ts — el typecheck de la app la consume y el CI de la
 * app falla si hay diff sin regenerar (ver check.sh).
 *
 * Si la fuente no existe (p. ej. CI sin el repo del backend clonado), avisa y
 * deja el archivo existente intacto.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FUENTE = path.join(ROOT, "..", "solvershub-backend", "docs", "openapi.json");
const SALIDA = path.join(ROOT, "src", "core", "api", "schema.d.ts");

if (!fs.existsSync(FUENTE)) {
  console.warn("api:types: no existe ../solvershub-backend/docs/openapi.json; se conserva el archivo actual.");
  process.exit(0);
}

const bin = path.join(ROOT, "node_modules", ".bin", "openapi-typescript");
execFileSync(bin, [FUENTE, "-o", SALIDA, "--alphabetize"], { stdio: "inherit" });
console.log(`api:types: ${path.relative(ROOT, SALIDA)} generado.`);
