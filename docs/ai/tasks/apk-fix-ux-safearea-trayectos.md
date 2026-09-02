# Tarea: Corrección de UX — SafeArea, avatares, header y vista de trayectos

- **Origen:** Feedback del usuario 2026-09-02 (APK).
- **Estado:** completada
- **Fecha:** 2026-09-02

## Objetivo
Corregir en la APK: (1) safe area para que no se pierda el menú inferior ni la barra de notificaciones, (2) avatares de clientes visibles (backend no servía /uploads → fotos 404), (3) header con el nombre de la APK en pantalla inicial, (4) enlace para ver los trayectos generados (≤9 paradas, HU-55/HU-37).

## Bloques (checklist TDD)
- [x] Backend: `useStaticAssets` + placeholders JPEG reales en seed (fotos ya servidas: HTTP 200 por túnel).
- [x] A1: SafeArea — `SafeAreaProvider` en App, `SafeAreaView` en Rutas/Clientes/Día/Login, `insets` en CustomTabBar (test: paddingBottom 42 con inset 34).
- [x] A2: `urlArchivo()` en config (test) + Avatar con URL absoluta + ClienteScreen usa Avatar (test actualizado).
- [x] A3: Header "CobraIA" en RutasScreen (test).
- [x] A4: `enlaceGoogleMapsRuta` (HU-37, test) + `TrayectosLista` (test) + botón "Ver trayectos" en Día con overlay (test).

## Resultado final
- `scripts/check.sh` APK: 187 tests verdes.
- `scripts/check.sh` backend: verde.
- Fotos de clientes verificadas por túnel (HTTP 200).
- Endpoints validados en vivo: mis-rutas (tipoInteres/numCuotas), clientes (fotoUrl+coords), dia (trayectos segmentados ≤9), tarjeta, prestamos, posicion.