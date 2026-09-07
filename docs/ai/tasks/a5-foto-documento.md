---
estado: completada
tags: [tarea]
---

# Tarea: A5 — Foto y documento del cliente desde la APK

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A5) + decisión "en la APK y en el panel, según permisos".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
En `ClienteScreen` el cobrador puede subir la foto facial y el documento del cliente (multipart `foto_facial`/`documento_frente`) vía el endpoint cobrador de evidencias (B2). Requiere permiso `actualizar_cliente` y flags de ruta (valida el backend).

## Bloques (checklist TDD)
- [x] Bloque 1: API `agregarEvidenciasCliente` (FormData) en la APK.
- [x] Bloque 2: hook `useEvidenciasCliente` (galería/cámara, 1 foto + 1 documento).
- [x] Bloque 3: formulario "Foto / documento" en ClienteScreen (modo `evidencias`) + guardar.
- [x] Verificación: test del formulario + `scripts/check.sh` verde (169 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (169 tests).
- Archivos: `src/api/cobrador.ts`, `src/features/cliente/use-evidencias-cliente.ts`, `src/screens/ClienteScreen.tsx`, `src/screens/ClienteScreen.test.tsx`, `docs/ai/tasks/a5-foto-documento.md`.
- Pendientes: offline para evidencias de cliente (solo online hoy).