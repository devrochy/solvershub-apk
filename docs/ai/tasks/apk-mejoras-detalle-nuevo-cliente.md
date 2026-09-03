# Tarea: Mejoras APK — detalle cliente, nuevo cliente, navegación y rutas

- **Origen:** feedback del usuario 2026-09-03 (modo build).
- **Estado:** completado
- **Rama:** `feature/rediseno-rutas-dia` (mismo PR #25) + backend `feature/cobrador-endpoints-rediseno` (PR #91).

## Bloques

### Backend B1 — ruta inactiva
- `test-Ruta Inactiva` (estatus `bloqueado`, asignada al cobrador A) creada en `semilla()` y `sincronizarDataDePrueba()`.
- Idempotente (`rutaRepo.findOne`). El dominio no tiene "inactivo": se usa `bloqueado` como estado no-activo.
- Verificado en vivo: `mis-rutas` devuelve la ruta 1786 con estatus `bloqueado`.

### APK A1 — ModalConFooter X a la derecha
- Título a la izquierda, botón cerrar (X) a la derecha (`justifyContent: space-between`).

### APK A2 — selector de prefijo telefónico con bandera
- `src/domain/paises-telefono.ts`: catálogo de países con prefijo y bandera emoji (sin dependencias).
- `src/components/CampoTelefono.tsx`: botón con bandera + prefijo abre lista de países; input solo el número local; emite número internacional completo.

### APK A3 — nuevo cliente
- Marker en posición GPS al abrir (`expo-location`).
- Búsqueda por dirección (`Location.geocodeAsync`) con barra + botón buscar.
- Tope máximo pre-llenado con `cupoDefault` de la ruta activa (si > 0).
- Avatar editable + documento frente/reverso en fila superior.
- Check verde de éxito tras crear (`cliente-creado-ok`).
- Footer del modal siempre visible (`flexShrink` en el cuerpo).
- `CampoTelefono` reemplaza el input de teléfono.

### APK A4 — detalle de cliente
- Header "Información del cliente" + back + Editar; color según clasificación (`verde/rojo/azul/blanco`).
- SafeAreaView (respeta barra de notificaciones).
- Botón "Editar ubicación" junto a "Cómo llegar".
- Avatar + documento (frente/reverso) en una sola fila.

### APK A5 — modales avatar/documento con preview + Guardar
- Seleccionar imagen → previsualiza local → botón Guardar sube a la API (antes subía automático sin preview).

### APK A6 — headers de secciones con fondo blanco
- Sección de préstamos con fondo blanco/borde/card.

### APK A7 — menú inferior
- Al tocar un tab, cierra el overlay de detalle (si está abierto) para ver la sección.

### APK A8 — detalle de ruta
- SafeAreaView + botón back en header.

### APK A9 — tarjetas de ruta
- Header + borde verde si activa; rojo opaco si no (`estatus !== "activo"`).

### APK A10 — screenshot WhatsApp
- Captura solo el canvas de cuotas (sin botones Enviar/Registrar).

### APK A11 — trayectos
- SafeAreaView + botón back en header.

## Verificación
- `scripts/check.sh` APK → verde (255 tests, 37 suites).
- `scripts/check.sh` backend → verde (856 tests).
- Prueba en dispositivo pendiente.