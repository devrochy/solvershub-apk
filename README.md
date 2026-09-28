
## Sistema de diseño

- La paleta del APK se deriva de los tokens de marca SolversHub (`src/theme/tokens.ts`,
  generado). Cambiar la marca: editar `solvershub/brand/tokens/tokens.json` -> `npm run build`
  alli -> `npm run tokens:sync` aqui. Detalle en `docs/ai/tasks/tokens-solvershub.md`.
- Pendiente: barrido de hex hardcodeados en componentes y tipografias Montserrat/Inter (hoy Roboto).
