# apk-detalle-cliente-mejoras

- **Rama:** `feature/apk-detalle-cliente-mejoras` (desde `develop`)
- **Estado:** en progreso
- **Dependencias:** ninguna
- **Alcance (TDD):** ajustes puntuales del detalle de cliente.

## Objetivo

1. El preview de documento/avatar muestra la imagen **completa** en el recuadro
   de carga (`resizeMode: contain`), no recortada.
2. La sección de préstamos pone un **icono de WhatsApp a la izquierda** del
   título "Préstamo #id" y elimina el botón "Enviar por WhatsApp" inferior.
3. La modal de cuota ya no muestra el botón "Cerrar" (basta la X del header).

## Cambios (`src/screens/ClienteScreen.tsx`)

- Estilo `evidenciaPreview`: `resizeMode: "cover"` → `"contain"` (+ altura ~200).
- Header del detalle del préstamo: fila con icono WhatsApp (llama
  `compartirDetalle`) a la izquierda del título; se quita el bloque
  `btn-whatsapp` inferior.
- Modal de cuota (`modal === "cuota"`): eliminar `labelCancelar="Cerrar"` /
  `onCancelar` (queda solo la X).

## Definición de Terminado
- `scripts/check.sh` APK verde (se actualizan los tests de ClienteScreen).
- Commit convencional + PR a `develop` (CI verde).

## Resultado real
- `evidenciaPreview`: `resizeMode: "contain"`, altura 200 y fondo claro — la imagen del documento/avatar se ve completa.
- Header del detalle del préstamo: fila con icono WhatsApp (testID `btn-whatsapp`) a la izquierda del título "Préstamo #id"; se eliminó el botón "Enviar por WhatsApp" inferior.
- Modal de cuota: sin `onCancelar`/`labelCancelar="Cerrar"` (solo la X).
- Tests: 3 nuevos en `ClienteScreen.test.tsx` (contain, WhatsApp en header, sin Cerrar). `scripts/check.sh` APK verde (279 tests).