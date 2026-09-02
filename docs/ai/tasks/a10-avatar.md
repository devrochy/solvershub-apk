# Tarea: A10 — Avatar con foto/iniciales en listas de clientes

- **Origen:** Plan consolidado aprobado por el usuario 2026-09-02 (Epic A10) + decisión "foto real en lista + backend".
- **Estado:** completada
- **Fecha inicio:** 2026-09-02

## Objetivo
Componente `Avatar` reutilizable: muestra la foto del cliente si existe (`fotoUrl`) o un círculo con las iniciales del nombre. Integrado en la lista de clientes de la ruta (`ClientesScreen`).

## Bloques (checklist TDD)
- [x] Bloque 1: `Avatar` + `inicialesDe` (tests 5).
- [x] Bloque 2: `ClienteCobradorPublic.fotoUrl` (espeja el backend B2).
- [x] Bloque 3: integrar en `ClientesScreen` + test de avatar con iniciales.
- [x] Verificación: `scripts/check.sh` verde (164 tests).

## Resultado final
- Comandos: `scripts/check.sh` APK (164 tests).
- Archivos: `src/components/Avatar.tsx`, `src/components/Avatar.test.tsx`, `src/types/cobrador.ts`, `src/screens/ClientesScreen.tsx`, `src/screens/ClientesScreen.test.tsx`, `docs/ai/tasks/a10-avatar.md`.
- Pendientes: usar Avatar también en la tarjeta de ClienteScreen y lista del día (DiaScreen no trae fotoUrl en ClienteDiaPublic).