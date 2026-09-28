#!/usr/bin/env node
// Sincroniza el tema React Native generado por la marca (SolversHub) a la APK.
//
// Fuente única: solvershub/brand/tokens/tokens.json → dist/theme.ts (generado por
// brand/tokens/build.mjs). Aquí solo se COPIA; si cambias la paleta, edita
// tokens.json y corre `npm run build` en brand/tokens, luego esto.
//
// Uso: npm run tokens:sync   (o `node scripts/sync-tokens.mjs <ruta-al-brand>`)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
const brandTokens = arg
  ? resolve(arg)
  : join(ROOT, "..", "..", "solvershub", "brand", "tokens");

const src = join(brandTokens, "dist", "theme.ts");
const dest = join(ROOT, "src", "theme", "tokens.ts");

const BANNER = `// GENERADO — no editar a mano.
// Copia de solvershub/brand/tokens/dist/theme.ts (fuente: tokens.json, DTCG).
// Regenerar: (cd brand/tokens && npm run build) && npm run tokens:sync
`;

const content = readFileSync(src, "utf8");
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, BANNER + content);
console.log(`✓ ${dest}`);
