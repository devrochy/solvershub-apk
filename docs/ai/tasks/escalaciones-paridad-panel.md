---
estado: completado
tags: [operacion, escalaciones, bandeja, panel, accesibilidad]
---

# Escalaciones · paridad con la lista del panel

- **Origen:** fase 2 del pedido del dueño (2026-10-28) para llevar a la app la lista de
  Escalaciones del panel, después de la bandeja de Conversaciones.
- **Alcance:** filtro por motivo, tarjetas con motivo/estado/fecha, resumen completo en hoja,
  paginación, refresco, vacío y error. Sin cambios de backend.
- **Estado:** implementada en la rama `feature/conversaciones-paridad-panel`.

## Qué se hizo

1. **API (`src/modules/operacion/api.ts`)**
   - `listarEscalaciones` acepta `reason_code` y `page`, con `FiltroEscalaciones`.
2. **Filtros (`components/FiltrosEscalaciones.tsx`)**
   - Chip con el motivo activo y hoja con `RadioGroup` con todos los motivos.
   - “Limpiar” cuando hay filtro.
3. **Tarjeta (`components/TarjetaEscalacion.tsx`)**
   - Avatar y nombre del cliente, `Badge` de motivo con tono, `Badge` de estado, fecha y
     resumen a dos líneas.
   - Acciones “Ver resumen” y “Abrir conversación”, además de pulsar la tarjeta.
4. **Resumen (`components/ResumenEscalacionSheet.tsx`)**
   - Hoja con motivo, estado, fecha, resumen completo y CTA para abrir la conversación.
5. **Pestaña (`components/PestanaEscalaciones.tsx`)**
   - Carga por página, `RefreshControl`, infinite scroll, esqueletos, error con reintentar y
     vacío contextual (“Ver conversaciones” o “Limpiar filtro”).
   - Se reutiliza `presentacion.ts` para etiquetas, tonos, fechas y estados.
6. **Operación (`screens/OperacionScreen.tsx`)**
   - La pestaña se delega al componente nuevo; se eliminó la lista plana anterior.
   - Al cambiar de pestaña se limpia el error y se marca la carga.

## Tests

- `OperacionScreen.test.tsx`:
  - lista con motivo, estado y resumen;
  - filtro por `reason_code`;
  - resumen completo en hoja;
  - paginación de escalaciones;
  - vacío con vuelta a Conversaciones.
- `presentacion.test.ts`: estados de escalación.
- `npx jest src/modules/operacion`: **6 suites, 40 tests ✓**.
- `npm run typecheck` sin errores en `src/modules/operacion`.
- `npm run lint` sin errores nuevos en `src/modules/operacion`.

## Pendientes

- PR de la fase a `develop` (después de la fase 1).
- Smoke manual en dispositivo.
