# Plantilla de módulo (ADR-APP-01, SPEC-25)

Cada módulo de la app vive en `src/modules/<nombre>/` y expone un contrato fijo.
Para crear un módulo nuevo:

1. Copia esta estructura:

```
src/modules/<nombre>/
├── navigation.tsx      # navigator del módulo + tipos de ruta (los compone AppNavigator)
├── screens/            # pantallas (una por archivo, estilo del repo)
├── features/           # lógica de negocio PURA (TS sin JSX), testeable
├── api.ts              # cliente tipado de la superficie que consume
├── repository.ts       # acceso a datos (red + caché/sync vía @data)
├── index.ts            # exporta el navigator y los tipos públicos del módulo
└── __tests__/          # tests junto al código (patrón del repo)
```

2. Reglas de frontera (verificadas por `scripts/check-module-boundaries.mjs`):
   - Un módulo **solo** importa de su propia carpeta, de `@core/`, de `@shared/`
     y de `@data/`. Nunca de otro módulo ni de carpetas legacy.
   - El shell (`src/navigation/`) es el único que importa de varios módulos
     (compone navigators y aplica permisos).
   - `@core/` = config, clientes HTTP genéricos, sesión, tema, i18n.
   - `@shared/` = ui-kit, hooks, utils, formatters, tipos de contrato.
   - `@data/` = base local cifrada, repos, sync-engine, auditoría local.

3. Pantallas: seguir las skills `ui-consistency` y `financial-ux` (design tokens
   de `@core/theme/tokens`, nada de hex hardcodeado).

4. Cierre de la HU: `npm run check` en verde (fronteras + lint + typecheck +
   tests) y el archivo de tarea en `docs/ai/tasks/` con el resultado real.
