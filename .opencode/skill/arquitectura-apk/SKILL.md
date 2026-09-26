# Arquitectura APK — Cumplimiento estructural (solvershub-apk)

Usar al crear o mover módulos, pantallas, hooks o tipos nuevos. Asegura que sigan exactamente la estructura y convenciones de `src/` descubiertas en el repo.

## 1. Estructura de carpetas (obligatoria)

| Módulo | Dónde vive |
|---|---|
| Clientes HTTP tipados | `src/api/` (`client.ts`, `cobrador.ts`, `auth.ts`, `offline-sync.ts`) |
| Componentes presentacionales compartidos | `src/components/` (`ColorBadge`, `CargaError`, `EvidenciaPicker`) |
| Catálogos de dominio | `src/domain/` (`catalogos.ts`) |
| Lógica por feature (TS puro + tests) | `src/features/<feature>/` (cliente, estado-cuenta, gastos, navegacion, prestamo, trayectoria, visita) |
| Tipos de navegación | `src/navigation/types.ts` (`RootStackParamList`) |
| Caché/cola offline | `src/offline/` (`cache.ts`, `cola.ts`, `offline-context.tsx`) |
| Pantallas | `src/screens/` (`LoginScreen`, `RutasScreen`, `DiaScreen`, `ClienteScreen`) |
| Sesión JWT | `src/session/` (`session-context.tsx`, `token-store.ts`, `jwt.ts`) |
| Tipos de API | `src/types/` (espejan los `*Public` del backend) |

- Lógica de negocio **pura** (sin JSX) va en `src/features/<feature>/`, no en las pantallas.
- Hooks de feature (p. ej. `use-evidencias.ts`, `use-trayectoria.ts`) viven dentro de `src/features/<feature>/`.

## 2. Convenciones de nombres

- **Archivos:** kebab-case (`use-evidencias.ts`, `session-context.tsx`, `estado-cuenta.ts`).
- **Componentes/funciones exportadas:** PascalCase para componentes (`ColorBadge`), camelCase para funciones/hooks (`useSession`, `guardarCliente`).
- **Tipos de API:** sufijo `*Public` espejando el backend (`ClienteTarjetaPublic`, `DiaApkPublic`); payloads de entrada sufijo `*Input` (`RegistrarVisitaInput`).
- **Identificadores en español** (`cobrador`, `rutas`, `cliente`, `tarjeta`, `prestamos`, `cuotas`, `saldoPendiente`, `diasMora`).

## 3. Patrón de pantalla (data fetching)

Toda pantalla que haga fetch sigue este patrón (ver `DiaScreen`/`ClienteScreen`):

1. Loader con `useCallback` (`cargar`) que setea `error` y el estado de datos.
2. `useEffect` en mount que llama a `cargar()` (con comentario `eslint-disable-next-line react-hooks/set-state-in-effect` solo si es fetch asíncrono en mount).
3. Estado de carga/error con `CargaError`: `if (!datos) return <CargaError cargando={!error} error={error} onReintentar={cargar} />`.
4. Manejo de errores: `apiErrorStatus(err) === 401` → `logout()`; `esErrorDeRed(err)` → fallback a cache offline; otro → mensaje de error genérico.
5. Estados locales de formularios con `useState` (p. ej. `valor`, `enviando`, `mensaje`); `mensaje` es `string | null`.

## 4. Registro de pantallas en navegación

- Las rutas se declaran en `src/navigation/types.ts` (`RootStackParamList`) con tipos por parámetro.
- Cada pantalla tipa sus props con `NativeStackScreenProps<RootStackParamList, "Nombre">`.
- Las pantallas se registran en `App.tsx` dentro del `Stack.Navigator`, con `options={{ title }}`; condicional según `cobrador` (login vs app).

## 5. Estado global: React Context (sin librerías de store)

- No hay Redux/Zustand. Estado global vía **Context** (patrón `SessionProvider`/`OfflineProvider`).
- Crear `useXxx()` que lanza error si se usa fuera de su provider.
- Estado local y por pantalla con `useState`/`useMemo`/`useCallback`.

## 6. Tests y TDD

- Tests **colocados junto al fuente**: `src/.../<nombre>.test.ts(x)`.
- Sigue el ciclo Red → Green → Refactor (AGENTS.md). Todo cambio de producción requiere test nuevo.
- Usa `testID` en los elementos que los tests necesitan referenciar.

## 7. Anti-alucinación / fuentes de verdad

- No inventar endpoints ni campos. Verificar contra el backend (`devrochy/app-cobranza`) o `src/types/`/`src/api/`.
- Los tipos `*Public` deben espejar los del backend; no inventarlos.
- No inventar datos de negocio; usar fixtures marcados `test-`/`fixture-`.
- Jerarquía: instrucción del usuario > contrato real de la API > AGENTS.md > archivos de tarea.

## 8. Checklist de arquitectura

- [ ] Ubicación correcta en `src/` según la tabla.
- [ ] Nombres: kebab-case / PascalCase / `*Public` / `*Input` / español.
- [ ] Pantalla con patrón `useCallback` + `CargaError` + manejo 401/offline.
- [ ] Ruta declarada en `RootStackParamList` y registrada en `App.tsx`.
- [ ] Estado con Context si es global; `useState` si es local.
- [ ] Test colocado junto al fuente, Red→Green→Refactor.
