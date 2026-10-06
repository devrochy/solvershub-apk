# ADR-APP-01 — La app oficial es un monolito modular (no un monorepo de paquetes)

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-1

## Contexto

La app deja de ser solo el APK de cobranza y se convierte en la app oficial de todo el panel de
SolversHub: auth, dashboard, operación, cobranza, comercio, calendario, negocio, configuración,
herramientas y plataforma. El repo actual (`solvershub-apk`, Expo SDK 57 managed, TypeScript strict)
es un monolito por capas (`src/api`, `src/screens`, `src/features`, …) con 13 pantallas, ~23k LOC y
490 tests. Hay que decidir cómo crecer sin romper lo que ya funciona.

## Decisión

Un solo proyecto Expo con **módulos por feature en carpetas** (`src/modules/<modulo>/`) y fronteras
duras: ningún módulo importa de otro; solo `src/core/` (config, api, sesión, tema, i18n) y
`src/shared/` (ui-kit, hooks, utils) son compartibles. Un script en CI (`scripts/check-module-boundaries.mjs`)
valida la regla con el mismo espíritu que el invariante 5 del backend ("ningún pack importa de otro pack").

Estructura objetivo:

```
src/
  app/          # bootstrap, providers, DI
  core/         # config, ApiClient (admin+gestor), sesión, i18n, theme
  shared/       # ui-kit, hooks, utils, formatters
  data/         # expo-sqlite cifrado, repos, sync-engine, auditoría local
  modules/      # auth, dashboard, operacion, cobranza, comercio, calendario,
                # negocio, configuracion, herramientas, plataforma,
                # notificaciones, busqueda, auditoria
  navigation/   # AppNavigator que compone los navigators de cada módulo
```

Cada módulo expone un contrato interno fijo: `navigation.tsx` (rutas), `screens/`, `features/`
(lógica pura), `api.ts` (cliente tipado), `repository.ts`, `__tests__/`.

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Monorepo multi-paquete (un paquete npm por módulo) | Fricción de Metro y versionado con un solo desarrollador; no hay beneficio de build incremental en managed workflow; migrar después de un monolito modular es barato |
| Dividir en dos apps (cobranza + panel móvil) | Viola el requisito "un solo APK para todo el panel"; duplica auth, tema y release |
| Seguir el monolito por capas actual | Con 10+ módulos, `src/screens` y `src/features` se vuelven inmanejables; sin fronteras se mezclan dominios |

## Consecuencias

**Positivas:** una sola app y un solo release; reuso total de `core` y `shared`; la regla de fronteras
detecta acoplamientos en CI; la migración de cobranza (HU-APP-07) es mover archivos con tests verdes.

**Negativas / lo que aceptamos pagar:** el equipo debe respetar la regla de fronteras desde el día uno;
los módulos comparten versión de librerías (no hay versionado independiente).

**Qué haría que revisáramos esto:** dos equipos trabajando en módulos con ciclos de release distintos,
o necesidad de publicar SDKs por separado.

## Impacto en el código

- `scripts/check-module-boundaries.mjs` (nuevo, corre en `scripts/check.sh` y CI).
- Reestructura física en HU-APP-01 y HU-APP-07 sin cambio de comportamiento.
