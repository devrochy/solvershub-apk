# AGENTS.md — Reglas del sistema para agentes de IA en la APK del gestor (app-cobranza-apk)

Este archivo se carga automáticamente en cada sesión de OpenCode. Es la fuente de verdad sobre cómo debe comportarse el agente en este proyecto.

## 0. Contexto del proyecto

- **Producto**: APK del gestor de la plataforma de préstamos y cobranza (CobraIA). Consume la API del backend NestJS (`devrochy/app-cobranza`) vía HTTP (modo en línea) y la API de sincronización offline (device key) en modo offline.
- **Stack**: Expo (React Native) + TypeScript. Navegación con React Navigation (native-stack). Sesión JWT (jose) en `expo-secure-store`. Tests con Jest (`jest-expo`) + React Native Testing Library.
- **Endpoints del backend** (fuente de verdad en `devrochy/app-cobranza`): `POST /auth/gestor/login`, `POST /auth/refresh`, `GET /gestor/mis-carteras`, `GET /gestor/carteras/:id/trayecto-diario`, `POST /gestor/carteras/:id/visitas/pago|no-pago`, `POST /gestor/carteras/:id/gastos`, `POST /gestor/carteras/:id/trayectoria-real`, `GET /gestor/carteras/:id/clientes/:clienteId/tarjeta`, `POST /sync-offline/eventos`, `GET /sync-offline/trayecto-diario`. **No inventar endpoints ni campos**: verificar contra el backend.

## 1. Modo de Planeación vs. Modo de Ejecución

- **Modo Planeación (`plan`)**: leer los docs del backend y el plan aprobado, diseñar el enfoque, identificar ambigüedades. Salida: alcance + preguntas + descomposición en tareas.
- **Modo Ejecución (`build`)**: solo después de aprobar el plan. Escribir `docs/ai/tasks/<slug>.md`, seguir el ciclo TDD por bloque, actualizar la tarea con el resultado real, commit + PR obligatorio por tarea (rama `feature/<slug>` desde `develop`, Conventional Commits).

## 2. Jerarquía de fuentes de verdad

1. Instrucción explícita del usuario en la conversación actual.
2. El contrato real de la API del backend (`devrochy/app-cobranza`) — se verifica en el repo backend o con una llamada real, nunca se asume.
3. Este archivo (`AGENTS.md`).
4. Archivos de tarea en `docs/ai/tasks/`.

## 3. No asumas contextos ambiguos — protocolo obligatorio

Si falta información (flujo de auth, contrato de un endpoint, formato de un campo), **detente y pregunta** o **verifica contra el backend**. No inventes endpoints ni campos.

## 4. Anti-alucinación

- Antes de usar un endpoint, verifícalo en el backend (repo `app-cobranza` o una llamada real). No asumas.
- Los tipos de `src/types/` deben espejar los `*Public` del backend (NestJS), no inventarse.
- No inventes datos de negocio; usa fixtures marcados `test-`.

## 5. Seguridad y secretos

- `EXPO_PUBLIC_API_URL` y cualquier secreto viven en `.env.local` (nunca se commitea; documentar en `.env.example` sin valor real).
- Los tokens (access/refresh) viven en `expo-secure-store` (nunca en AsyncStorage/logs). No loguear tokens.
- Solo `EXPO_PUBLIC_*` se expone al bundle de la app; los secretos del backend NUNCA van en la app.

## 6. Definición de "Terminado" (DoD)

1. `npm run check` (scripts/check.sh) pasa completo (lint + typecheck + tests).
2. Hay pruebas nuevas que cubren el comportamiento (Red → Green → Refactor).
3. El archivo de tarea en `docs/ai/tasks/<slug>.md` refleja el resultado real.
4. No quedan TODO/FIXME sin registrar.
5. Commit + PR por tarea completada: rama `feature/<slug>` desde `develop`, PR a `develop`, CI en verde.

## 7. Cómo correr

```bash
npm install
cp .env.example .env.local   # EXPO_PUBLIC_API_URL=http://localhost:3000
npx expo start               # dev server; escanea con Expo Go o emulador
npm run check                # lint + typecheck + test
```

El backend NestJS debe estar corriendo en `http://localhost:3000` (o la IP de tu máquina para un dispositivo físico; configurar en `.env.local`).