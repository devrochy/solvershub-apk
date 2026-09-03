# Tarea: Navegación por ruta y rediseño de detalle (N1-N6)

- **Origen:** feedback del usuario 2026-09-03 (modo build).
- **Estado:** completado
- **Rama:** `feature/rediseno-rutas-dia` (PR #25).

## Objetivo
Reestructurar la navegación: tras login se muestra la selección de ruta sin
menú inferior; al entrar a una ruta se navega al Main (tabs) con la pestaña
"Día" por defecto. Rediseñar tarjetas de ruta y de cliente, y el detalle del
cliente (header neutro + tarjeta con header propio + edición sin ubicaciones +
"Editar ubicación" con mapa embebido).

## Bloques

### N1 — Navegación
- `RootStackParamList`: `Login → SeleccionRuta → Main`.
- `SeleccionRutaScreen` (nuevo, antes RutasScreen): pantalla de stack sin tab
  bar, lista de rutas; al tocar una ruta fija `rutaActiva` y navega a `Main`.
- `RootTabParamList`: `Ruta / Dia / Clientes`; `initialRouteName="Dia"`.
- Pestaña `Ruta` = `RutaDetalleScreen` (lee la ruta activa del contexto).

### N2 — Tarjetas de ruta
- Header con el nombre de la ruta (fondo verde si activa, rojo si bloqueada).
- Iconos de KPIs más grandes.
- Chevron derecho en la tarjeta; sin footer "Consultar"; sin texto activo/inactivo.

### N3 — Pestaña Ruta
- `ContenidoRuta` renderiza `RutaDetalleScreen` (info + Editar + notas).
- Back navega a `SeleccionRuta`; estado "sin ruta" si no hay ruta activa.

### N4 — Tarjetas de cliente
- Fondo de la tarjeta completo según estado (`fondoDeEstado` en ColorBadge).
- Se quita el punto (ColorBadge). Aplica en ClientesScreen y DiaScreen.

### N5 — Detalle cliente
- Header de la vista neutro (blanco), sin Editar.
- La tarjeta principal tiene header propio: nombre (izquierda) + Editar (derecha).

### N6 — Editar cliente y ubicación
- Modal editar: solo nombre, apellido, negocio, WhatsApp (sin ubicaciones).
- Botón "Editar ubicación" alineado con "Cómo llegar".
- Modal de ubicación: chips Negocio/Domicilio + mapa embebido + barra de
  dirección (geocodeAsync) + guardar (PATCH actualizarCliente).
- `CobradorApi.actualizarCliente` nuevo (PATCH a clientes/:id).

## Verificación
- `scripts/check.sh` APK → verde (258 tests, 37 suites).
- Code-review: RECHAZADO → corregido. Hallazgos bloqueantes resueltos:
  - `actualizarCliente` con tests en `cobrador.test.ts` (PATCH negocio y domicilio).
  - `guardarUbicacion` con tests de payload (negocio y domicilio vía guardar-ubicacion).
  - `OverlayDetalle` reenvía `latitudDomicilio`/`longitudDomicilio` (test incluido).
  - Estado "sin ruta" de `RutaDetalleScreen` testeado.
  - Estilos muertos eliminados (headerAccionTexto, seccionEspacio, headerEspacio).
- Backlog: mapa "Cómo llegar" stale tras guardar ubicación; 2N requests por ruta.
- Prueba en dispositivo pendiente.