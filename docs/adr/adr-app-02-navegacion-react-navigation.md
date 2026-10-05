# ADR-APP-02 — React Navigation 7 como navegador único, compuesto por módulos y permisos

- **Estado:** aceptado
- **Fecha:** 2026-10-05
- **Contexto:** SPEC-25 (solvershub-docs), decisión D-SPEC-25-2

## Contexto

El APK usa React Navigation 7 con `native-stack` y declara `bottom-tabs` sin uso. La app oficial
necesita: login + onboarding, shell distinto por rol (gestor de campo vs dueño/colaborador de panel),
secciones visibles según permisos (RBAC del backend), deep links (notificaciones push, links de pago)
y navegación estable para la cobranza existente.

## Decisión

Mantener **React Navigation 7**. Cada módulo exporta su propio navigator (`navigation.tsx`) y tipos
de ruta; `src/navigation/AppNavigator` los compone. El shell se arma en runtime desde los permisos:
para dueño/colaboradores se filtra por `MeResponse.permissions` (secciones del panel, igual que el
sidebar web) y para gestores por los 14 permisos finos del pack de cobranza. Los deep links se
configuran con `linking` de React Navigation (`solvershub://…`) sobre las mismas rutas.

Estructura de navegación:

```
RootStack
├── AuthStack        # login, recuperar, invitaciones, vinculación
├── FieldShell       # gestor: tabs Diario · Carteras · Clientes · Notificaciones · Perfil
└── PanelShell       # dueño/colaborador: tabs + drawer según permisos
    ├── Home (dashboard)
    ├── Operacion (conversaciones, escalaciones, leads)
    ├── Cobranza (16 secciones, visibles por permiso de sección)
    ├── Comercio · Calendario · Negocio
    └── Más: Configuración · Herramientas · Plataforma · Búsqueda · Auditoría
```

## Alternativas consideradas

| Opción | Por qué no |
|---|---|
| Migrar a expo-router | Reescribir toda la navegación y 13 pantallas con regresión en cobranza; deep links se logran igual con `linking` |
| Un solo stack plano con pantallas condicionales | No escala a 10 módulos; pierde tabs/drawer nativos y estado por pestaña |
| Navegación fija sin permisos | Viola "nunca un 403 por diseño" (constitución §1.3); los módulos deben ocultarse, no fallar |

## Consecuencias

**Positivas:** cero regresión en cobranza; el patrón "navigator por módulo" fuerza el contrato del
módulo; los permisos se aplican en un solo lugar (el armado del shell).

**Negativas / lo que aceptamos pagar:** hay que mantener tipos de rutas por módulo y evitar
referencias cruzadas entre navigators (alineado con ADR-APP-01).

**Qué haría que revisáramos esto:** si Expo deprecia React Navigation o si el equipo crece y prefiere
routing por archivos para paridad con el panel web.

## Impacto en el código

- `src/navigation/AppNavigator` + `navigation.tsx` por módulo (HU-APP-03).
- Configuración `linking` para deep links (`app.json` scheme `solvershub` ya existe).
