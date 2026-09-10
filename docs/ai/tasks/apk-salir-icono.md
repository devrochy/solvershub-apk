---
estado: terminado
tags: [tarea]
---

# Tarea: apk-salir-icono

- **Origen:** petición del usuario (2026-09-10): añadir un icono al botón
  "Salir" del header de la lista de rutas.
- **Estado:** terminado.
- **Fecha inicio:** 2026-09-10

## Objetivo
Añadir un icono a la píldora "Salir" (`btn-salir`) del header de
`SeleccionRutaScreen`, siguiendo el patrón de la píldora "Editar"
(`MaterialIcons` + texto dentro de `estilosHeader.accionPill`).

## Bloque (checklist)
- [x] `SeleccionRutaScreen`: `<MaterialIcons name="logout" size={18} color="#172f6c" />`
      antes del texto "Salir". Sin cambios de estilo (`accionPill` ya es fila con
      `gap: 2`). Cambio puramente visual (sin tests nuevos).

## Resultado final
- `bash scripts/check.sh` → verde.
- Archivos: `src/screens/SeleccionRutaScreen.tsx`.
- Pendiente: validación visual en dispositivo (Expo Go).
