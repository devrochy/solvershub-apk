---
estado: terminado
tags: [tarea]
---

# Tarea: apk-modal-pastel

- **Origen:** petición del usuario (2026-09-10): estandarizar el modal con
  header azul principal (como `HeaderPantalla`) y suavizar los colores internos
  a tonos pastel para que la interfaz sea menos brusca.
- **Estado:** en progreso.
- **Fecha inicio:** 2026-09-10

## Objetivo
- `ModalConFooter` (componente estándar, 10 usos) con **header azul `#172f6c`**
  (título e icono de cerrar blancos) y el resto del modal en **tonos pastel**.
- Campos internos de los modales con color pastel (inputs, labels, chips).
- Opcional por consistencia: header azul en el modal de liquidación del día
  (DiaScreen) y en el selector de país de `CampoTelefono`.

## Paleta pastel (tokens aprobados)
| Uso | Hex |
|---|---|
| Header (azul principal) | `#172f6c` |
| Texto/icono sobre header | `#ffffff` |
| Subtítulo sobre header | `#d4dff0` |
| Fondo del modal (cuerpo) | `#f5f7ff` |
| Fondo de campo (input) | `#ffffff` |
| Borde de campo | `#dbeafe` |
| Label | `#64748b` |
| Texto de valor | `#334155` |
| Fondo chip inactivo | `#eef2ff` |
| Borde chip inactivo | `#c7d2fe` |
| Botón confirmar | `#2563eb` |
| Botón cancelar (fondo/texto) | `#eef2ff` / `#172f6c` |
| Backdrop | `rgba(23, 47, 108, 0.25)` |

## Bloques (checklist TDD)
- [x] Bloque 1: `ModalConFooter` con header azul `#172f6c` (título/icono
      blancos) + cuerpo/footer/backdrop pastel; prop opcional `subtitulo`.
      `ModalConFooter.test.tsx` ampliado (header azul + subtítulo).
- [x] Bloque 2: componente `CampoModal` (label + `TextInput` pastel) + test.
- [x] Bloque 3: migrados a `CampoModal` los inputs simples de los modales
      (Dia: gasto; Clientes: nuevo cliente; Cliente: editar cliente, nuevo
      préstamo; RutaDetalle: nueva nota) y suavizados `input`/`label`/`chip` en
      ClienteScreen/ClientesScreen a la paleta pastel.
- [x] Bloque 4: header azul en el modal de liquidación del día (DiaScreen) y en
      el selector de país de `CampoTelefono`.
- [x] Bloque 5: skill `ui-consistency` actualizada con los tokens pastel y los
      componentes estándar (`ModalConFooter`, `CampoModal`).

## Fuera de alcance
- Cambiar la estructura de los formularios (solo estética + `CampoModal` en
  inputs simples).
- El modal de liquidación conserva su layout a pantalla completa (solo header).

## Resultado final (llenar al completar)
- `bash scripts/check.sh` → verde (lint + typecheck + tests).
- Archivos: `src/components/ModalConFooter.tsx` (+test), `CampoModal.tsx`
  (+test), `CampoTelefono.tsx`, `DiaScreen.tsx`, `ClientesScreen.tsx`,
  `ClienteScreen.tsx`, `RutaDetalleScreen.tsx`, skill `ui-consistency`.
- Pendiente: validación visual en dispositivo (Expo Go).
