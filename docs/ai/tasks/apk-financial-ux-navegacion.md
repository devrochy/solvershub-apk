# Tarea: apk-financial-ux-navegacion (tabs + lista clientes + canvas cuotas)

- **Origen:** Petición directa del usuario 2026-09-02 (rediseño APK: navegación con menús, lista de clientes de ruta, préstamos de un cliente, canvas de cuotas pagadas/mora/actual/futuras + abonos). Aplica skills `ui-consistency`, `financial-ux`, `arquitectura-apk`.
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Rediseñar la navegación de la APK con tabs inferiores + stack, agregar la lista completa de clientes de una ruta y una pantalla de préstamo dedicada con un canvas de cuotas (cuadros que distinguen pagadas, en mora, cuota actual y futuras) y abonos a cuotas.

## Fuera de alcance
- Refactor de estilos a tema centralizado (se registra en backlog; se copia el patrón según `ui-consistency`).
- Modo offline para las nuevas pantallas (se consume online con fallback a cache existente).

## Bloques (checklist TDD)
- [x] Bloque 1: Navegación con bottom tabs (Rutas / Clientes / Día) + stack (Cliente, Prestamo). Tipos en `src/navigation/types.ts`, registro en `App.tsx`, contexto de ruta activa.
  - Test(s): `RutasScreen.test.tsx` (setea ruta activa + navega al tab), `DiaScreen.test.tsx` (usa ruta activa), typecheck.
- [x] Bloque 2: Pantalla "Clientes de la ruta" (`ClientesScreen`) que consume `GET /cobrador/rutas/:rutaId/clientes` y navega a Cliente.
  - Test(s): `src/screens/ClientesScreen.test.tsx` (4 tests).
- [x] Bloque 3: Lógica pura de canvas de cuotas en `src/features/prestamo/canvas-cuotas.ts` — clasifica cada cuota en `pagada | en_mora | actual | futura | pendiente_sin_saldo`.
  - Test(s): `src/features/prestamo/canvas-cuotas.test.ts` (6 tests).
- [x] Bloque 4: Pantalla `PrestamoScreen` — canvas visual de cuadros de cuotas + abonos por cuota (estado de cuenta del cobrador).
  - Test(s): `src/screens/PrestamoScreen.test.tsx` (4 tests).
- [x] Bloque 5: Navegación desde `ClienteScreen` a `PrestamoScreen`; tipos `EstadoCuentaPrestamoPublic`/`ClienteCobradorPublic` y funciones API en `src/api/cobrador.ts`.
  - Test(s): `src/screens/ClienteScreen.test.tsx` (navega al canvas).

## Decisiones tomadas durante la implementación
- Se consumen los nuevos endpoints cobrador del backend (lista de clientes y estado de cuenta con abonos/saldo por cuota).
- El canvas clasifica "cuota actual" como la primera cuota pendiente/atrasada con saldo pendiente > 0; "futura" como las pendientes posteriores; "en_mora" las atrasadas; "pagada" las pagadas.

## Ambigüedades resueltas con el usuario
- Pregunta: ¿agregar endpoints al backend? → **Sí**.
- Pregunta: navegación → **tabs inferiores + stack**.
- Pregunta: datos de prueba → **ampliar seed si hace falta**.

## Resultado final (llenar al completar)
- Comandos ejecutados para verificar: `scripts/check.sh` (lint + typecheck + 151 tests, 23 suites) + `npx expo export --platform web` (bundle OK).
- Archivos modificados:
  - `App.tsx` — RootStack (Login/Main/Cliente/Prestamo) + BottomTabs (Rutas/Clientes/Día) + `RutaActivaProvider`.
  - `src/navigation/types.ts` — `RootTabParamList` + `RootStackParamList` con `Main`, `Prestamo`.
  - `src/session/ruta-activa-context.tsx` (+provider) — ruta activa compartida entre tabs.
  - `src/screens/ClientesScreen.tsx` (+test, 4) — lista de clientes de la ruta.
  - `src/screens/PrestamoScreen.tsx` (+test, 4) — canvas de cuotas con abonos.
  - `src/features/prestamo/canvas-cuotas.ts` (+test, 6) — clasificación `pagada/en_mora/actual/futura/pendiente_sin_saldo`.
  - `src/screens/RutasScreen.tsx` (+test ajustado) — setea ruta activa y navega al tab Clientes.
  - `src/screens/DiaScreen.tsx` (+test ajustado) — lee ruta activa del contexto.
  - `src/screens/ClienteScreen.tsx` (+test navegación) — botón "Ver canvas de cuotas" → Prestamo.
  - `src/types/cobrador.ts` — `ClienteCobradorPublic`, `CuotaEstado`, `EstadoCuentaPrestamoPublic`.
  - `src/api/cobrador.ts` — `listarClientesDeRuta`, `obtenerEstadoCuentaPrestamo`.
  - `package.json` — `@react-navigation/bottom-tabs`.
  - `docs/ai/tasks/apk-financial-ux-navegacion.md` (este archivo).
- Pendientes/seguimiento:
  - Backend (repo `app-cobranza`, rama `feature/cobrador-cartera-navegacion`) expone los endpoints; PR pendiente de merge a develop.
  - El seed nuevo (abono parcial) requiere reiniciar el backend con BD fresca o `SEED_TEST_DATA=true` para que el canvas muestre abonos.
  - Próximo: build EAS + instalación en el celular con la URL del túnel.