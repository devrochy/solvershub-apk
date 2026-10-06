# HU-APP-15 · Wire del sync offline (Fase A)

## Resultado

El motor de sync (HU-APP-15 engine) quedó conectado a la app:

- `@data/escrituras.ts`: escrituras encoladas offline con **despachadores por módulo**
  (idempotentes, reintento con contador de intentos).
- `@data/sync-global.ts`: `sincronizarTodo` recorre las entidades de operación, comercio,
  calendario y cobranza; un error corta su módulo y sigue con los demás.
- `@data/SincronizadorProvider.tsx` (montado en App): sincroniza con sesión admin + red
  (al arrancar y cada vez que la red vuelve).
- `@data/busqueda-cache.ts`: búsqueda local sobre la caché sin red (mín. 2 caracteres,
  tope 30 resultados).
- **Comercio**: cambio de estado de pedido con soporte offline (`cambiarEstadoPedidoConOffline`
  + despachador registrado en `index.ts`): online → API; sin red → cola + aviso "se
  sincronizará al reconectar".
- **Búsqueda**: al fallar la búsqueda en línea, cae a resultados guardados en el teléfono.
- Matriz offline actualizada en `src/data/README.md`.

## Verificación

- 5 tests nuevos (escrituras encoladas con reintento, sync global con aislamiento de
  errores, búsqueda en caché, comercio offline): **595/595** en `npm run check`.
- `jest.setup.ts`: mock de NetInfo con `default` (lo exige el provider y la pantalla de comercio).

## Deuda restante (documentada)

- Hidratación de las LISTAS de operación/comercio/calendario desde la caché al perder red
  (hoy el sync llena la caché; las pantallas aún consultan la API — el fallback visual
  offline por pantalla llega con la iteración de cada módulo).
- Escritura encolada de citas (mover/cancelar) y acciones cobranza-admin.
