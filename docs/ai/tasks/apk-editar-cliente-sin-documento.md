---
estado: completada
tags: [tarea]
---

# Tarea: permitir editar cliente sin documento (APK)

- **Origen:** `docs/ai/tasks/requerimientos-apk.md` → `REQ-APK-017` (hallazgo H-76; quick win del plan de benchmark).
- **Estado:** completada
- **Fecha inicio:** 2026-09-16

## Objetivo
Que un cliente sin documento de identidad pueda editar otros campos (nombre, negocio, teléfono); el documento se valida solo si la edición lo toca.

## Fuera de alcance
- Obligatoriedad del documento según `ruta-config` (se mantiene lo que ya enforce el backend/config).
- Validar el teléfono en edición (otro quick win de `REQ-APK-018`).

## Bloques (checklist TDD)
- [x] Bloque 1: `guardarCambioCliente` valida el documento solo si `tipoDocumento`/`numeroDocumento` cambiaron.
  - Test(s): `src/screens/ClienteScreen.test.tsx` → "permite editar nombre/negocio cuando el cliente no tiene documento".

## Decisiones tomadas durante la implementación
- La validación se condiciona a que el documento haya sido tocado (comparando con `edicionOriginal`), en vez de exigirlo siempre.
- Se conserva el mensaje de error cuando el documento sí se toca y es inválido.

## Resultado final
- Verificación: `tsc --noEmit` limpio; `ClienteScreen.test.tsx` 60/60 verde aislado (`--runInBand`). (La corrida completa de `check.sh` es flaky por paralelización, preexistente.)
- Archivos: `src/screens/ClienteScreen.tsx` (+ test).
- Pendientes/seguimiento: validar teléfono en edición (`REQ-APK-018`).
