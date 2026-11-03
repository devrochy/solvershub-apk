---
estado: completada
tags: [tarea]
---

# Tarea: enlace-documentacion-avatar — ítem «Documentación» en la tarjeta de cuenta + LICENSE

- **Origen:** seguimiento de la spec `01-enlace-documentacion-en-avatar.md` de `solvershub-wiki` (§2.7); el panel ya lo tiene (rama `feat/enlace-documentacion-avatar`).
- **Estado:** completada (pendiente de revisión y merge)

## Objetivo
1. Ítem «Documentación» en `CuentaPanel`, entre Perfil y Tema oscuro, que abre la wiki del panel (`/ayuda`) con el navegador del sistema.
2. Corregir el titular del `LICENSE` (plantilla de Expo → titular del proyecto) y dejar el aviso de Expo en `NOTICE`.

## Decisiones
- URL = `PANEL_URL` (`EXPO_PUBLIC_PANEL_URL`, por defecto la raíz del host de la API) + `/ayuda`, en `src/shared/panel-urls.ts` (`urlDocumentacion`, `URL_DOCUMENTACION`). Sin host no hay ítem. Ningún dominio en el componente.
- `CuentaPanel` recibe `documentacionUrl`; `CajonPanel` le pasa `URL_DOCUMENTACION`.
- Accesibilidad: `accessibilityRole="link"`, etiqueta «Documentación, se abre en el navegador». Íconos del kit: `menu-book` y `open-in-new`.
- La wiki exige sesión del panel: el navegador pedirá iniciar sesión.
- LICENSE con tilde (`Ramírez`, como el panel); el backend lo escribe sin tilde.

## Bloques
- [x] `urlDocumentacion` — `src/shared/panel-urls.test.ts`
- [x] Ítem en `CuentaPanel` — `src/navigation/CuentaPanel.test.tsx` (sin URL, rol/etiqueta/orden, `Linking.openURL`, rechazo)
- [x] LICENSE + NOTICE + README

## Resultado
Jest 212 suites / 1448 tests, lint y typecheck en verde. `npm run check` se detiene antes en `check-module-boundaries` por imports `../../datos-prueba` de archivos que esta tarea no toca (ya fallaban en `develop`).
