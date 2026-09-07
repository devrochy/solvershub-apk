---
estado: en progreso
tags: [tarea]
---

# feat-dia-mora-compromiso

- **Rama:** `feat/dia-mora-compromiso` (desde `develop`)
- **Estado:** en progreso
- **Dependencias:** backend `feat/dia-clientes-filtro` (diasMora + compromisoValor)
- **Alcance (TDD):** mostrar en la lista del día los días de mora y el compromiso de pago de hoy.

## Objetivo

La lista de "Cobros del día" muestra ahora, por cliente: "X días de mora"
(rojo) si `diasMora > 0` y "Compromiso de pago hoy: $Y" si hay `compromisoValor`.

## Cambios

- `src/types/cobrador.ts`: `ClienteDiaPublic` con `diasMora: number` y
  `compromisoValor: number | null`.
- `src/screens/DiaScreen.tsx`: en el item de la lista, textos `textoMora`
  (rojo) y `textoCompromiso` (ámbar) cuando corresponda.
- Tests: fixtures actualizados (DiaScreen/TrayectosLista/cache) + test nuevo.

## Definición de Terminado
- `scripts/check.sh` APK verde.
- Commit convencional + PR a `develop` (CI verde).

## Resultado real
- `ClienteDiaPublic` con `diasMora` y `compromisoValor`.
- `DiaScreen` muestra "X días de mora" (rojo) y "Compromiso de pago hoy: $Y"
  (ámbar) por cliente.
- Tests: fixtures actualizados + test de mora/compromiso.
- `scripts/check.sh` APK verde (297 tests).