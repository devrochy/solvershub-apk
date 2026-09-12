---
estado: completada
tags: [tarea]
---

# Tarea: apk-cliente-documento

- **Origen:** petición del usuario (2026-09-10). Backend ya expone
  `tipoDocumento`/`numeroDocumento` (PR en `app-cobranza`).
- **Estado:** completada.
- **Fecha inicio:** 2026-09-10

## Objetivo
La APK captura y muestra el **documento de identidad** del cliente (tipo —
CI/Pasaporte/NIT/Otro— + número, validado por tipo, obligatorio) en el alta,
en la edición y en el detalle.

## Fuera de alcance
- Domicilio en el alta (tarea aparte `apk-cliente-domicilio-alta`).

## Bloques (checklist TDD)
- [x] Bloque 1: catálogo + validador por tipo (`src/domain/tipo-documento.ts`,
      espeja el backend) + test.
- [x] Bloque 2: tipos (`CrearClienteInput`, `ClienteCobradorPublic`,
      `ClienteTarjetaPublic`) + payload de `crearCliente`.
- [x] Bloque 3: "Nuevo cliente" — chips de tipo + número (validado) y envío.
- [x] Bloque 4: edición (`CambioClienteInput`/`camposCambiados`/`edicionDesdeTarjeta`)
      + modal de edición con documento; detalle muestra el documento.
- [x] Bloque 5: tests + `scripts/check.sh`.

## Resultado final
- Tests: 45 suites / 348 tests OK (`--testTimeout=30000`; `check.sh` con el
  timeout por defecto falló de forma masiva por carga extrema del entorno,
  load ~200 — no por el código).
- Archivos: `src/domain/tipo-documento.ts` (+test), `src/types/cobrador.ts`,
  `src/api/cobrador.ts` (+test), `src/features/cliente/cambio-cliente.ts`
  (+test), `src/screens/ClientesScreen.tsx` (+test), `src/screens/ClienteScreen.tsx`
  (+test), fixtures de tests.
- Pendiente: validación visual en dispositivo; merge del backend primero.