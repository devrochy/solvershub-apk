# HU-APP-07 · Cobranza al núcleo sin regresión (app)

## Resultado (parcial — smoke E2E pendiente de corrida)

Cobranza migrada al módulo con cero regresión funcional (558 tests), cola offline en SQLite con
fallback seguro, descomposición parcial de la pantalla gigante y autovinculación verificada en
código.

### 7.1 Migración física (mecánica, tests verdes)

- `src/{screens,components,features,offline,session,api}` → `src/modules/cobranza/` y
  `src/navigation/{CarteraFlujo,menu-lateral-context,pantalla-activa-context,trayectos-overlay-context,types,overlays…}`
  → `src/modules/cobranza/navigation/`. Al moverse juntos, los imports relativos internos quedaron
  intactos; solo se ajustaron App.tsx y la composición.
- `MenuLateral`/`BotonMenu` pasaron a `src/navigation/` (composición): el módulo cobranza NO puede
  importar del módulo auth (regla ADR-APP-01) y el menú orquesta logout de ambas sesiones.
- Resultado: `check-module-boundaries` OK sobre 200+ archivos del módulo; 552/552 tests.

### 7.2 Cola offline en SQLite con fallback

- `offline/cola.ts` reescrito con la MISMA API pública y selección única de almacenamiento:
  SQLite (`cola_evento` vía `@data/repos/cola`) con **traspaso de la cola legacy** en la primera
  apertura (verificación de totales, borrado del origen, marca en SecureStore) y **fallback a
  AsyncStorage** si la base está apagada (kill-switch), falla al abrir o la migración no verifica.
- `@data/migracion/desde-asyncstorage.ts` adaptado al contrato real del `EventoOffline`
  (`eventoIdCliente`, `creadoEn`, `payload`/`dedupeKey`).
- 3 tests nuevos del camino SQLite + los 7 legacy del camino AsyncStorage siguen verdes.

### 7.3 Descomposición parcial

- `ClienteScreen` (2 576 LOC) → `features/cliente/presentacion.ts` (canvas de cuotas, etiquetas,
  `esPendienteOAtrasada`, `formatearFechaHora`) + 3 tests. Queda deuda: descomponer los modales de
  `ClienteScreen` y el trayecto de `TrayectoDiarioScreen` en hooks (próximas tandas).

### 7.4 Autovinculación de dispositivo

- Verificada en código: backend ADR-0068 con enforcement (`_enforcement_dispositivo`, #95 ya
  mergeado), y en la app `VincularDispositivoScreen` + `features/dispositivo` (Android ID vía
  expo-application) con tests. El ciclo completo (aprobar dispositivo en el panel) queda para la
  corrida E2E.

### 7.5 Smoke Maestro

- `e2e/smoke-cobranza.yaml` + `e2e/README.md` commiteados (login → selector → diario → pago →
  modo avión → sync → liquidación). **Pendiente de corrida**: requiere build `preview` (EAS) y
  la CLI de Maestro en el emulador.

## Verificación

- `npm run check`: fronteras OK · lint 0 errores · typecheck 0 errores · **558/558 tests**.
