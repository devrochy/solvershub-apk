
> **Un tema, un dueño.** Este repo es la **app de campo de cobranza** (Expo).
> La planificación vigente vive en
> [`solvershub-docs`](https://github.com/devrochy/solvershub-docs).

| Tema | Dueño |
|---|---|
| Planificación, backlog, decisiones | `solvershub-docs` |
| Motor multi-tenant, API, packs | `solvershub-backend` (GitHub `agent-core`) |
| Panel de administración | `solvershub-panel` |
| App de campo (cobranza) | **este repo** |
| Sitio público y formularios | `solvershub-landing` |
| Legal, comercial, runbooks | `solvershub-comercial` |

## Sistema de diseño

- La paleta del APK se deriva de los tokens de marca SolversHub (`src/core/theme/tokens.ts`,
  generado). Cambiar la marca: editar `../solvershub-panel/brand/tokens/tokens.json` -> `npm run build`
  alli -> `npm run tokens:sync` aqui. Detalle en `docs/ai/tasks/tokens-solvershub.md`.
- Reglas de UI, kit de componentes (`src/shared/ui`), tipografía Montserrat/Inter y guarda de
  colores sueltos: `DESIGN.md`. Tema oscuro por defecto, como el panel web (D-34).
