# ADR-APP-03 — Sesión unificada: un login, dos identidades (admin + gestor)

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-3

## Contexto

El backend tiene dos sistemas de identidad: (a) token opaco de sesión para admin
(`POST /api/v1/auth/login`, tabla `admin_sessions`, revocación inmediata) que sirve al panel y a
toda la API `/api/v1`; y (b) JWT HS256 access 12 h + refresh 30 días para gestores
(`/api/pack/pack_cobranza/auth/login`, ADR-0081) que sirve a la API de campo. La app oficial debe
ofrecer panel móvil (dueño/colaborador) y modo campo (gestor) con un solo login, respetando roles,
permisos y la vinculación de dispositivo.

## Decisión

**Un solo login de admin como puerta única** (`POST /api/v1/auth/login` con identifier+password).
La sesión admin (token opaco + `X-Tenant-Id`) da acceso a todos los módulos del panel según
`MeResponse.permissions`. Para el **modo campo**, un endpoint nuevo del backend
`POST /api/v1/auth/gestor-token` intercambia la sesión admin por un JWT de gestor (valida que el
usuario tiene rol de pack `gestor`, carteras asignadas y dispositivo vinculado, ADR-0068). La app
guarda ambos tokens en `expo-secure-store` y el `ApiClient` selecciona la credencial según el
módulo/superficie. El refresh del gestor conserva el flujo actual (`POST /auth/refresh`); la sesión
admin no tiene refresh (se re-loguea al expirar, como el panel).

Casos de entrada que se conservan del contrato actual: invitaciones pendientes
(`GET /auth/invitaciones`, aceptar/rechazar) y selección de negocio cuando hay varias membresías
(`seleccionRequerida`).

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Dos logins separados en la app (gestor por un lado, panel por otro) | Dos pantallas de entrada y dos sesiones conviviendo; peor UX y duplicación de recuperación/biometría |
| Emitir JWT de gestor directamente en el login admin | Acopla la tabla de sesiones admin al pack de cobranza; el core no depende de packs (invariante 5 del backend) |
| Migrar el gestor al token opaco del core | Rompe el contrato de campo vigente (ADR-0065/0081) y la vinculación por dispositivo |

## Consecuencias

**Positivas:** una sola puerta de entrada; permisos de panel y de campo calculados en el servidor;
el modo campo sigue cumpliendo ADR-0068; la recuperación de contraseña y la biometría se
implementan una sola vez sobre la identidad admin.

**Negativas / lo que aceptamos pagar:** dos tokens en el cliente (hay que coordinar expiración y
logout conjunto); un endpoint más en el backend.

**Qué haría que revisáramos esto:** que el pack de cobranza se mueva a la identidad del core o que
el login de gestor deje de existir.

## Impacto en el código

- Backend: `POST /api/v1/auth/gestor-token` en agent-core (HU-APP-02).
- App: `src/core/session/**` con doble credencial y `ApiClient` por superficie (HU-APP-02).
