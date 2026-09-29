---
estado: en-progreso
tags: [tarea, auth, multi-tenant]
---

# Tarea: apk-login-unificado-invitaciones (ADR-0081)

## Objetivo

Que la app funcione con **un solo login** (usuario/contraseña, sin slug ni rol) y
pueda elegir negocio cuando el usuario pertenece a más de uno; y que las
invitaciones a un negocio se listen/acepten/rechacen **dentro de la app**.

## Cambios

- `EXPO_PUBLIC_TENANT` deja de ser obligatorio (queda solo como override de pruebas).
- `apiLogin` pega a `POST /auth/login` (sin rol); soporta `seleccionRequerida` y
  `requiereMembresia`.
- Nuevas pantallas: `SeleccionNegocioScreen`, `InvitacionesScreen`.
- Sesión: `negociosPendientes`, `seleccionarNegocio(slug)`, `membresiaToken`,
  `invitaciones`, `resolverInvitacion(id, accion)`.
- Perfil/token: rol `gestor | propietario | master`.

## Resultado

- `apiLogin(usuario, password, tenant?)` contra `POST /auth/login`; soporta
  `seleccionRequerida` (+ `negocios`) y `requiereMembresia` (+ `membresiaToken`,
  `invitaciones`). `apiInvitaciones` y `apiResolverInvitacion` para el listado/aceptar.
- `SeleccionNegocioScreen` (solo si hay >1 negocio) e `InvitacionesScreen` (sin
  membresías). Gate en `App.tsx`; credenciales en memoria para re-loguear al elegir.
- `LoginScreen` sin toggle de rol. `EXPO_PUBLIC_TENANT` deja de usarse.
- Verificación: `npm run check` (lint + typecheck + **498 tests**) en verde.
- E2E con la API local (`:8010`) y el seed `scripts/seed_demo_login.py`:
  gestor con 2 negocios → selector; invitado → aceptar → entra al negocio.

