---
estado: pendiente
tags: [tarea]
---

# Tarea: apk-autovinculacion-dispositivo (Opción 2b — vinculación autoservicio)

- **Origen:** Decisión de diseño de la Épica 8 (HU-39/HU-43), 2026-09-11.
- **Estado:** pendiente — **BLOQUEANTE DE PRODUCCIÓN** (2026-09-15). No se implementa en el ciclo actual, pero es prerequisito del primer release a producción: en el MVP el login de cobrador no exige device vinculado, lo que en producción permitiría entrar desde cualquier equipo con las credenciales.
- **Fecha inicio:** —

## Objetivo
Que la APK vincule su propio dispositivo tras el primer login del cobrador, **con aprobación del administrador**, para no pedir el WhatsApp en cada login ni copiar el Android ID a mano en el panel.

## Contexto / estado actual (MVP)
- El backend ya valida el dispositivo en el login de cobrador (HU-39): si el cobrador tiene un device `activo`, exige que `imei` (Android ID) y `whatsappNumber` coincidan (`auth.service.ts` → `loginCobrador`); si no, responde **403** y registra el intento (HU-42).
- La APK **hoy no envía** `imei`/`whatsappNumber`: `src/api/auth.ts` manda solo `{ usuario, password }`. Por eso, con un device vinculado, el login da 403.
- Ya existen en el backend: `POST /devices` (admin), `GET /devices`, `PATCH /devices/:id/revocar`, y el estado de device `pendiente_revalidacion` (entidad `Device`).
- **Decisión del MVP:** no se implementa el envío en el login (Opción 1) ni el autoservicio. Se pospone a esta Opción 2b para poder probar con cualquier cobrador sin piezas adicionales.

## Flujo propuesto (2b)
1. El cobrador se loguea sin device vinculado → el backend lo permite.
2. La respuesta del login incluye el **`telefono`** del cobrador (hoy no lo expone) y/o un flag `dispositivoVinculado`.
3. La APK detecta "sin device" y muestra **"Vincular este dispositivo"**:
   - **Android ID** automático (`expo-application` → `Application.getAndroidId()`).
   - **WhatsApp** prellenado desde `telefono` (editable).
   - **Clave X25519** (pública) para cifrar el snapshot del día (HU-40).
4. La APK llama a `POST /cobrador/dispositivo` (JWT de cobrador) con `{ imei, whatsappNumber, publicKey }`.
5. El backend crea el device en estado **`pendiente_revalidacion`** y alerta al admin (reusar la interfaz de alertas, mock).
6. El **admin aprueba** el device en el panel → pasa a `activo`.
7. En los logins siguientes la APK envía `imei` + `whatsappNumber` (guardados en el dispositivo) → login correcto.

## Cambios backend (app-cobranza)
- Endpoint `POST /cobrador/dispositivo` (JwtAuthGuard + rol cobrador) que reusa `DevicesService` para `cobradorId = token.sub`, dejando el device en `pendiente_revalidacion`.
- Exponer `telefono` en `LoginResult` (y/o un `GET` de perfil del cobrador).
- Endpoint de aprobación admin (p. ej. `PATCH /devices/:id/aprobar`) que pasa el device a `activo`; definir el comportamiento del login mientras está `pendiente_revalidacion`.
- Alerta al admin al recibir una solicitud (reusar `AlertasService`).
- Tests unit + e2e.

## Cambios APK (app-cobranza-apk)
- `expo-application` para obtener el Android ID.
- `apiLogin` envía `imei` + `whatsappNumber` en el login de cobrador.
- Pantalla/flujo **"Vincular este dispositivo"** + llamada al endpoint nuevo.
- Persistencia en `SecureStore` del WhatsApp y del estado de vinculación.
- **Clave X25519**: definir origen — MVP: el backend genera el par y devuelve la privada al device (guardar en `SecureStore`); alternativa: librería de cripto en RN.
- Tests.

## Decisiones abiertas
- ¿La pantalla de vinculación es **bloqueante** (el cobrador no opera hasta que el admin apruebe) o puede operar y el device se activa al aprobar?
- Origen de la clave X25519 (backend vs APK).
- ¿El WhatsApp se prellena desde el perfil (requiere exponer `telefono`) o se pide igual en la pantalla?

## Relación con historias
- **HU-39:** vínculo WhatsApp + IMEI por dispositivo (aquí iniciado por el cobrador y aprobado por el admin).
- **HU-42:** alerta ante intentos no autorizados (mientras el device no está activo no debería alertar como intento).
- **HU-43:** re-vinculación por cambio de equipo (este flujo la cubre de forma natural).

## Bloques (checklist TDD, al retomar)
- [ ] Backend: `POST /cobrador/dispositivo` (estado `pendiente_revalidacion`) + tests.
- [ ] Backend: exponer `telefono` en login/perfil + tests.
- [ ] Backend: aprobación admin (`PATCH /devices/:id/aprobar`) + tests.
- [ ] APK: `expo-application` + `apiLogin` envía `imei`/`whatsappNumber` + tests.
- [ ] APK: pantalla "Vincular este dispositivo" + storage + tests.
- [ ] Prueba end-to-end con un cobrador real.

## Resultado final (llenar al completar)
- (pendiente)
