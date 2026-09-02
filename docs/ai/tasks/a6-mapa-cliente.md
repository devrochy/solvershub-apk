# Tarea: A6 — Mapa de la ubicación del cliente en la APK

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A6) + decisión "Leaflet en WebView".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
`ClienteScreen` muestra un mapa (WebView + Leaflet/OpenStreetMap) con el marker en la ubicación del cliente cuando hay coordenadas. Se conservan los botones Google Maps/Waze.

## Bloques (checklist TDD)
- [x] Bloque 1: instalar `react-native-webview` + mock en jest.setup.
- [x] Bloque 2: componente `MapaCliente` (WebView + HTML Leaflet).
- [x] Bloque 3: integrar en ClienteScreen antes de los botones de navegación.
- [x] Verificación: tests del mapa (2) + `scripts/check.sh` verde (171 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (171 tests).
- Archivos: `src/components/MapaCliente.tsx`, `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `jest.setup.ts`, `package.json`, `docs/ai/tasks/a6-mapa-cliente.md`.
- Pendientes: ninguno.