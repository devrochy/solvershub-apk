---
estado: en progreso
tags: [tarea]
---

# fix-cuota-evidencias-ux

- **Rama:** `fix/cuota-evidencias-ux` (desde `develop`)
- **Estado:** en progreso
- **Dependencias:** backend `fix/evidencias-y-config-apk` (agregarEvidencias sin validación + flags de ruta)
- **Alcance (TDD):** mejoras de UX reportadas en la modal de cuota y en la edición de evidencias.

## Objetivo

1. En la modal de cuota, el formulario de pago/no pago aparece **debajo** de los
   botones y el botón Guardar queda visible (todo dentro de un mismo ScrollView).
2. Al fallar la edición de una evidencia (foto/documento) se muestra el mensaje
   real del backend, no el genérico.
3. El resize de evidencias normaliza el tipo a `image/jpeg` (evita que el
   backend rechace fuentes HEIC/png convertidas).

## Cambios

- `src/screens/ClienteScreen.tsx`:
  - Modal de cuota: contenido + acciones + formularios + borrar en **un solo
    ScrollView** (se quita el `maxHeight` de `cuotaScroll`), con el orden
    contenido → mensaje → acciones → formulario → borrar.
  - `guardarEvidenciaSeleccionada`: parsea el body del error del backend.
- `src/features/cliente/use-evidencias-cliente.ts`:
  - `reducirImagen` devuelve `{ uri, convertidoAJpeg }`; si el resize tuvo
    éxito, la evidencia se normaliza a `type: "image/jpeg"` y extensión `.jpg`.
- Tests: `use-evidencias-cliente.test.ts` (caso HEIC → jpeg).

## Definición de Terminado
- `scripts/check.sh` APK verde.
- Commit convencional + PR a `develop` (CI verde).

## Resultado real
- Modal de cuota: un solo ScrollView con orden contenido → mensaje → acciones →
  formulario → borrar; `cuotaScroll` sin `maxHeight` (formulario debajo de los
  botones y Guardar visible al hacer scroll).
- `guardarEvidenciaSeleccionada` muestra el mensaje del backend.
- `reducirImagen` normaliza a `image/jpeg` tras el resize (test HEIC→jpg).
- `scripts/check.sh` APK verde (296 tests).