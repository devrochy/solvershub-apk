---
estado: completada
tags: [tarea]
---

# Tarea: Fixes de notificaciones, "Inicio" y refresco de cartera

- **Origen:** Petición directa del usuario (2026-09-19) tras probar la app.
- **Estado:** completada
- **Fecha inicio:** 2026-09-19

## Objetivo

1. "Inicio" del menú hamburguesa funciona desde cualquier pantalla (hoy no responde al abrir Notificaciones encima de la lista).
2. El título del header se refresca al cambiar de cartera.
3. Las notificaciones se pueden descartar una por una (además de "Marcar como vistas").
4. Al cambiar de cartera se evita mostrar los datos de la cartera anterior (recarga brusca).

## Fuera de alcance

- Persistir notificaciones descartadas en el backend (se descarta en el dispositivo).
- Animaciones de transición del stack (el usuario eligió "evitar el flash de recarga").

## Bloques (checklist TDD)

- [x] Bloque 1: `CarteraDetalleScreen` sincroniza el título del header cuando cambia la cartera activa.
  - Test(s): `src/screens/CarteraDetalleScreen.test.tsx`
- [x] Bloque 2: al cambiar de cartera, `CarteraDetalleScreen` resetea los datos de detalle (muestra carga limpia en vez de datos de la cartera anterior).
  - Test(s): `src/screens/CarteraDetalleScreen.test.tsx`
- [x] Bloque 3: `notificaciones-context` expone `descartar(id)` que persiste y filtra; `NotificacionesScreen` agrega un botón "X" por ítem.
  - Test(s): `src/session/notificaciones-context.test.tsx`, `src/screens/NotificacionesScreen.test.tsx`
- [x] Bloque 4: el ítem "Inicio" del menú navega correctamente al estar otra pantalla encima (lista y cartera).
  - Test(s): `src/screens/SeleccionCarteraScreen.test.tsx`, `src/navigation/CarteraFlujo.test.tsx`

## Decisiones tomadas durante la implementación

- Bug reproducido en dispositivo: con Notificaciones abierta encima de Main, el ítem "Inicio" de `SeleccionCarteraScreen` no tiene `onPress` → no navega.
- Descartar notificaciones = del lado del dispositivo (AsyncStorage), consistente con "Marcar como vistas".
- Se mantiene el menú igual en todas las pantallas (decisión del usuario).

## Ambigüedades resueltas con el usuario

- Pregunta: ¿cómo eliminar notificaciones? → Respuesta: descartar una por una con una "X" y conservar "Marcar como vistas".
- Pregunta: ¿qué significa "brusco"? → Respuesta: evitar el flash de recarga.
- Pregunta: ¿qué menú en Notif/Perfil/Config? → Respuesta: el mismo en cualquier pantalla.

## Resultado final (llenar al completar)

- Comandos ejecutados para verificar: `bash scripts/check.sh` → lint OK, typecheck OK, **61 suites / 453 tests**.
- Archivos modificados: `src/screens/CarteraDetalleScreen.tsx` (+ `.test.tsx`), `src/session/notificaciones-context.tsx` (+ `.test.tsx` nuevo), `src/screens/NotificacionesScreen.tsx` (+ `.test.tsx` nuevo), `src/screens/SeleccionCarteraScreen.tsx` (+ `.test.tsx`), `src/navigation/CarteraFlujo.tsx` (+ `.test.tsx`).
- Validación en dispositivo (`CPH2603` vía `adb`, Expo Go):
  - Notificaciones → menú "Inicio" navega a la lista (antes no hacía nada).
  - Al cambiar de cartera, el título del header se actualiza (test-Ruta Centro → test-Ruta Manizales).
  - La "X" de una notificación la descarta (el feed deja de mostrarla).
- Pendientes/seguimiento (si algún punto quedó fuera): ninguno.
