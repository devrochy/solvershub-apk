# Backlog — APK del cobrador (app-cobranza-apk)

Ítems de seguimiento detectados durante la implementación (no se resuelven en el mismo cambio).

## Tests de integración de pantalla (gasto multipart + GPS desde DiaScreen)
- Detectado en: revisión code-reviewer Fase A (2026-09-01)
- Descripción: `DiaScreen` no tiene test de integración (envío del gasto con evidencias multipart y el flujo del botón GPS, incl. aviso <2 puntos). Los hooks/componentes sí están cubiertos; el wiring de pantalla no.
- Prioridad sugerida: baja

## Fecha prometida con date picker nativo
- Detectado en: tarea apk-promesa-abono (2026-09-01)
- Descripción: la fecha se ingresa como texto `YYYY-MM-DD` (cross-platform). Candidato a `@react-native-community/datetimepicker` (con shim web) para mejor UX.
- Prioridad sugerida: baja

## SeleccionRutaScreen dispara 2 requests por ruta al montar
- Detectado en: code-review apk-navegacion-ruta-rediseno (2026-09-03)
- Descripción: con N rutas son 2N llamadas en paralelo (clientes + día por ruta). Aceptable hoy por la decisión de "solo datos existentes"; revisar si crece el número de rutas.
- Prioridad sugerida: baja

## check.sh flaky por paralelización (tests de pantalla)
- Detectado en: higiene 2026-09-15 (al verificar los PRs de refactor)
- Descripción: la corrida completa de `scripts/check.sh` falla de forma intermitente en suites de pantalla (`DiaScreen`, `ClientesScreen`, `ClienteScreen`, `RutaDetalleScreen`, `SeleccionRutaScreen`) por timeouts de 5s bajo saturación de workers; los mismos tests pasan aislados y en `develop` limpio falla una cantidad variable (0–6). No es un fallo lógico.
- Prioridad sugerida: media (estabilizar: subir timeout, `--runInBand` para pantallas o `maxWorkers`).

## Vinculación autoservicio del dispositivo desde la APK (HU-39/43) — Opción 2b — BLOQUEANTE DE PRODUCCIÓN
- Detectado en: decisión de diseño Épica 8 APK (2026-09-11)
- Descripción: la APK vincula su propio device tras el primer login (Android ID
  automático + WhatsApp del perfil + clave X25519) y el admin lo aprueba (el
  device queda en `pendiente_revalidacion`). En el MVP se decidió **no**
  implementar el envío en el login (Opción 1) ni el autoservicio, lo que en
  producción permitiría entrar desde cualquier equipo con las credenciales.
- Detalle del plan: `apk-autovinculacion-dispositivo.md`.
- Prioridad sugerida: **alta (bloqueante de producción)**

## Foco cobrador vs panel de referencia (benchmark)
- Detectado en: benchmark Smart 369 (2026-09-15) — `app-cobranza-admin/docs/ai/tasks/panel-benchmark-smart369.md`.
- Descripción: relevar el flujo del cobrador de la referencia (reporte diario, lista de clientes, registro de pago) y cerrar brechas reales en la APK.
- Tarea derivada: `apk-foco-cobrador.md` (esfuerzo medio).

---

## Resueltos (historial)

- **JWT en localStorage (web)** → `apk-seguridad-jwt-web`: tokens y perfil en memoria (`Map`) en web; `expo-secure-store` en nativo.
- **Evidencias de gasto en offline** → `apk-evidencias-offline`: fotos en base64 en el payload del evento `gasto`, persistidas por `EvidenciasOfflineService` al sincronizar.
- **Cambio de cliente offline (HU-47)** → `apk-cambio-cliente-offline`: UI de edición que encola `cambio_cliente` con dedupe por cliente.
- **Device key inválida deja la cola atascada** → `apk-feedback-device-key`: `OfflineProvider.errorSync` + aviso en `RutasScreen`; la cola no se vacía ante fallo.
- **Doble lenguaje visual del estado del cliente** → `p2-ux-visual`: `ClientesScreen` pasa de fondo pastel completo a tarjeta blanca + barra de acento + sombra (mismo lenguaje que `DiaScreen`).
- **Contraste de enlaces cian** → `p2-ux-visual`: `#0891b2` → `#0e7490` (cyan-700, ~4.9:1) en todo `src/`.
- **Mapa "Cómo llegar" no reflejaba la nueva ubicación** → `p2-mapa-stale` (backend + APK): la tarjeta expone lat/lng y `ClienteScreen` prioriza las coords frescas sobre las props del overlay.
- **`inicialesDe` código muerto** → `p2-polish`: eliminado de `Avatar.tsx` (y su test).
- **Doble capa de permisos en liquidación** → `p2-polish`: `RutaActiva` expone `permisos` y `DiaScreen` gatea el botón por `generar_reporte` además del flag de ruta.
- **`TrayectosLista` con estilos locales** → ya usaba `estilosHeader` (resuelto en `apk-headers-estandar`); se cierra el ítem.
- **Edición de ruta desde la APK** → `apk-editar-ruta` (#53): modal nombre/interés/cuotas gated por `actualizar_ruta`; `RutaActiva.permisos`.
- **Cálculo de "en mora" duplicado** → `contar-en-mora` (#55): helper `src/domain/contar-en-mora.ts`.
- **Modal de evidencias duplicado en ClienteScreen** → `evidencias-modal` (#56): componente `EvidenciasModal` reutilizable.

