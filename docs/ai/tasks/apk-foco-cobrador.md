---
estado: pendiente
tags: [tarea]
---

# Tarea: apk-foco-cobrador (paridad del flujo cobrador vs referencia)

- **Origen:** `docs/ai/tasks/panel-benchmark-smart369.md` (mejora #6, esfuerzo medio).
- **Estado:** pendiente
- **Fecha inicio:** —

## Objetivo
Relevar y cerrar brechas del **flujo del cobrador** (APK) frente a lo que la referencia muestra al cobrador en reporte diario, lista de clientes y registro de cobro.

## Fuera de alcance
- Panel admin (tareas `panel-*`).
- Rediseño visual completo de la APK.

## Alcance
1. Relevar en la referencia las vistas que consume el cobrador (p. ej. lista de clientes del día, registro de pago, reporte diario de su ruta) y compararlas con `app-cobranza-apk`.
2. Identificar brechas funcionales (campos, filtros, acciones, offline) y proponer las de impacto real.
3. Implementar las brechas priorizadas (una por una, TDD).

## Bloques (checklist TDD)
- [ ] Bloque 0: relevamiento y matriz de brechas APK vs referencia; registrar hallazgos.
- [ ] Bloque 1: definir sub-tareas priorizadas a partir del relevamiento.
- [ ] Bloque 2: implementar la(s) de mayor impacto.
- [ ] Bloque 3: tests de pantalla/hook.

## Dependencias / riesgos
- La referencia está orientada a web; no todo aplica a campo (offline, GPS, cámara).
- Verificar endpoints del backend antes de consumir.

## Resultado final (llenar al completar)
- (pendiente)
