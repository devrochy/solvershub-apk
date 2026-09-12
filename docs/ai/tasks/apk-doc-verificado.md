---
estado: completada
tags: [tarea]
---

# Tarea: apk-doc-verificado

- **Origen:** petición del usuario (2026-09-10): (1) al abrir el documento
  frente/reverso o la foto de perfil en el detalle del cliente no se veía la
  imagen previsualizada en la modal; (2) cuando el documento está verificado el
  recuadro se veía vacío y quiere un icono de documento frente/reverso.
- **Estado:** completada.
- **Fecha inicio:** 2026-09-10

## Causa raíz
El backend devuelve las rutas de archivo **relativas** (`/uploads/...`, ver
`app-cobranza/src/common/url-archivo.ts`). `ClienteScreen` las pasaba directo a
`<Image source={{ uri }}>` sin el helper `urlArchivo()` (que sí usa `Avatar`),
así que RN no podía cargarlas → recuadro vacío y sin preview en la modal.

## Bloques (checklist TDD)
- [x] Bloque 1: resolver con `urlArchivo(...)` las URLs de `documentoFrenteUrl`,
      `documentoReversoUrl` y `tarjeta.fotoUrl` usadas en las modales (no en
      `pendiente.uri`, que es `file://` local).
- [x] Bloque 2 (opción B): los recuadros Frente/Reverso muestran un **icono de
      documento** (`badge` frente, `credit-card` reverso) en vez de la foto; la
      foto real se ve solo en la modal. Verificado → fondo pastel verde
      (`#dcfce7`) e icono `#16a34a`; Pendiente → borde punteado e icono
      `#94a3b8`.
- [x] Bloque 3: tests actualizados — iconos `doc-frente-icono`/`doc-reverso-icono`,
      estado verificado, y preview con URL relativa resuelta a `${API_URL}/uploads/...`.

## Resultado final
- `bash scripts/check.sh` → verde (44 suites / 341 tests).
- Archivos: `src/screens/ClienteScreen.tsx` (+test).
- Pendiente: validación visual en dispositivo (Expo Go).
