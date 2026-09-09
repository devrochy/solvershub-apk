---
estado: en progreso
tags: [tarea]
---

# Tarea: apk-headers-estandar

- **Origen:** petición del usuario (2026-09-09): estandarizar los headers de las vistas de la APK, excluyendo Login. Quejas detectadas: tamaño de texto distinto entre pantallas, título centrado en unas y a la izquierda en otras, y vistas sin el azul de fondo `#172f6c`.
- **Estado:** en revisión visual

## Auditoría (estado antes del cambio)

| Vista | HeaderPantalla | padding H/V | Título (fontSize/align) | Subtítulo | Acciones |
|---|---|---|---|---|---|
| SeleccionRuta | Sí | 16/14 | 18 / izquierda | "Selecciona una ruta" 13 | badge + Salir |
| DiaScreen | Sí | 16/12 | 20 / izquierda | — | "+ Gastos" |
| ClientesScreen | Sí | 16/14 | 18 / izquierda | "{n} clientes" 13 | "+ Cliente" |
| ClienteScreen | Sí | 12/12 | 17 / **centrado** | — | back |
| RutaDetalle | Sí | 16/14 | 17 / **centrado** | — | back + Editar |
| TrayectosLista (modal) | No (blanco) | 12/14 | 16 / izquierda | detalle 13 | back |

## Estándar definido (canon en `HeaderPantalla.tsx`, exportado como `estilosHeader`)

- Fondo azul `#172f6c` vía `HeaderPantalla` (cubre la barra de estado) en TODAS las pantallas autenticadas.
- Fila del header: `fila` = row, center, gap 8, paddingHorizontal 16, paddingVertical 12.
- Título: `titulo` = flex 1, fontSize **18**, Roboto_700Bold, `#ffffff`, alineación **izquierda** (estándar único).
- Subtítulo: `subtitulo` = 13, Roboto_400Regular, `#d4dff0`.
- Ranuras laterales fijas `columnaIzq` / `columnaDerecha` (width 72) para mantener el título alineado igual en todas las vistas.
- Acciones: `accionTexto` (Salir/Editar: 14, 600, blanco) y `accionPill`/`accionPillTexto` (CTA píldora blanca, texto `#172f6c`).
- Modales/overlays (TrayectosLista, ModalConFooter) conservan fondo blanco (patrón de modal) pero alinean tipografía del título al estándar (18).

## Bloques (checklist TDD)

- [x] Bloque 1: tokens `estilosHeader` en `HeaderPantalla.tsx` + test del componente (banda azul, insets, tamaño 18).
- [x] Bloque 2: aplicar el estándar en `DiaScreen`, `ClientesScreen`, `SeleccionRutaScreen`, `ClienteScreen`, `RutaDetalleScreen` (JSX + limpieza de estilos duplicados).
- [x] Bloque 3: `TrayectosLista` tipografía 18; `check.sh` verde (40 suites / 304 tests) + bundle web exportado OK (dist/).

## Decisiones tomadas durante la implementación
- **Alineación única: izquierda.** ClienteScreen y RutaDetalleScreen antes centraban el título (17); se pasaron a izquierda, tamaño 18. La mayoría de vistas ya era izquierda y el estándar único simplifica.
- **TrayectosLista (modal) se mantiene blanco** (patrón de overlay), solo se alineó la tipografía del título (16→18) y paddings (16/12).
- **PrestamoScreen queda fuera**: es código muerto (no hay navegador que lo registre; `NativeStackScreenProps` tipo "Prestamo" sin Stack.Screen). Está en el backlog si revive.
- **LoginScreen excluida** por diseño (fondo blanco).
- Se agregó el token `accionesDerecha` (row, gap 10, sin ancho fijo) para el caso badge+Salir de SeleccionRuta; las ranuras de 72 (`columnaIzq`/`columnaDerecha`) son solo para las vistas con back/acción lateral.

## Code review (2026-09-09)
- Veredicto: **APROBADO CON OBSERVACIONES** (no hay bloqueantes).
- Obs a aplicar: estilo muerto `headerDetalle` en ClientesScreen (eliminado); docstring de ranuras 72 sobrevendía el estándar (corregido).
- Deuda registrada en backlog: estilos locales de TrayectosLista replican el canon sin componer `estilosHeader`.
- Pendientes de verificación visual en dispositivo: título de ClienteScreen en modo stack con ranura izquierda vacía; altura/alineación del bloque título+subtítulo en SeleccionRuta/Clientes (el `flex:1` del token `titulo` dentro de `bloqueTitulo` opera en el eje vertical).