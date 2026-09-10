---
estado: terminado
tags: [tarea]
---

# Tarea: apk-cliente-domicilio

- **Origen:** petición del usuario (2026-09-10): registrar también el domicilio
  del cliente en el alta, reutilizando el mismo mapa con un toggle
  Negocio/Domicilio.
- **Estado:** terminado.
- **Fecha inicio:** 2026-09-10

## Objetivo
En "Nuevo cliente", capturar la ubicación del **negocio** (obligatoria) y la del
**domicilio** (opcional) con el mismo mapa/búsqueda, cambiando de una a otra con
un toggle; enviar `latitudDomicilio`/`longitudDomicilio` al crear.

## Fuera de alcance
- Documento de identidad (tarea `apk-cliente-documento`).

## Bloques (checklist TDD)
- [x] Bloque 1: `CrearClienteInput` + `latitudDomicilio?`/`longitudDomicilio?` y
      payload de `crearCliente`.
- [x] Bloque 2: "Nuevo cliente" con chips Negocio/Domicilio; mapa/búsqueda/
      coordenadas editan el campo seleccionado; el domicilio es opcional.
      Test: `src/screens/ClientesScreen.test.tsx` (+1).
- [x] Bloque 3: `scripts/check.sh`/tipo de cambio verde.

## Resultado final
- Tests: `npx jest --silent --testTimeout=30000` OK (la suite completa).
- Archivos: `src/types/cobrador.ts`, `src/api/cobrador.ts`,
  `src/screens/ClientesScreen.tsx` (+test).
- Pendiente: validación visual en dispositivo; merge tras el PR del documento.