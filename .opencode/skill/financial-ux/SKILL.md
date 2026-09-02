# Financial UX — UX financiera CobraIA (app-cobranza-apk)

Usar en cualquier pantalla/formulario que maneje **dinero, cuotas, préstamos, saldos, mora o reportes**. Estandariza el tratamiento de montos, datos tabulares de deuda y badges de estado en el cobrador.

## 1. Inputs de dinero (moneda)

- Todo campo de monto usa `keyboardType="decimal-pad"` (o `"number-pad"` para enteros como cuotas/días).
- El valor se guarda como **string** en el `useState` y se convierte con `Number(valor)` solo al validar/enviar.
- Validación obligatoria antes de enviar:
  - Usar `validarMonto(monto)` de `src/features/visita/validaciones.ts` (y `validarFechaPrometida` para promesas).
  - Alternativa genérica: `Number.isFinite(valor) && valor > 0` (patrón de gastos en `DiaScreen`).
  - Nunca permitir negativos ni NaN. Mostrar mensaje en español si falla ("Ingresa un valor válido.").
- No formatear con símbolo `$` dentro de los inputs (los usuarios escriben números planos). El `$` solo aparece en texto de reporte/WhatsApp.

## 2. Datos tabulares de deuda (cuotas / estado de cuenta)

Patrón de `ClienteScreen` (estado de cuenta):
- Cada cuota en un recuadro con borde: `recuadroCuota` (`borderWidth 1`, `borderColor #e2e8f0`, `borderRadius 8`).
- Mostrar: `Cuota {numeroCuota} — {valorEsperado} ({estatus})` + `Vence {fechaVencimiento}`.
- **Cuotas atrasadas** se destacan con `recuadroCuotaMora`: `borderColor #fca5a5`, `backgroundColor #fef2f2`.
- Saldo y mora vienen de `ClienteTarjetaPublic` (`saldoPendiente`, `diasMora`); mostrar juntos ("Saldo pendiente: X | Mora: Y días").
- Próxima cuota a pagar: la primera cuota con `estatus === "pendiente" || "atrasada"`.

## 3. Badges de estado (colores semánticos)

- **Siempre** usar `ColorBadge` (`src/components/ColorBadge.tsx`) con la clave semántica; nunca construir badges propios.
- Colores válidos: `verde #16a34a`, `rojo #dc2626`, `azul #2563eb`, `blanco #94a3b8`.
- Mapear estados de negocio a colores de forma consistente en toda la app:
  - Cuota `estatus`: `pendiente` → azul, `atrasada` → rojo, `pagada` → verde.
  - Préstamo `estatus`: `vigente` → azul/verde, `liquidado` → verde, `cancelado` → blanco.
  - Color de cliente/riesgo (`tarjeta.color`): `azul`/`rojo`/`blanco`.
  - Lista del día (`ClienteDiaPublic.color`): `verde`/`rojo`/`blanco`.

## 4. Catálogos de negocio (no hardcodear)

- Métodos de pago y motivos de no pago **siempre** desde `src/domain/catalogos.ts`:
  - `METODOS_PAGO`: efectivo, transferencia, qr, tarjeta, deposito.
  - `MOTIVOS_NO_PAGO`: no_esta, no_tiene_dinero, se_volo, pago_ya, no_hay_nadie, se_traslado, esta_enfermo, compromiso_de_pago.
- Renderizar como `chips` seleccionables (patrón `ClienteScreen`): `chip` / `chipActivo` (bg `#2563eb`) / `chipTexto` / `chipTextoActivo`.
- Si se agrega un valor nuevo, actualizar el catálogo en `catalogos.ts`, no en la pantalla.

## 5. Reporte por WhatsApp (estado de cuenta)

- Usar los helpers de `src/features/estado-cuenta/estado-cuenta.ts`:
  - `textoReportePrestamo(prestamo, tarjeta)` para el texto formateado.
  - `numeroWhatsApp(telefono)` y `enlaceWhatsApp(telefono, texto)` para el enlace `wa.me`.
- No reimplementar formato ni sanitización de teléfono en las pantallas.

## 6. Tipos de pago / abono

- Tipo de pago: `"cuota" | "abono"` (selección con chips).
  - `cuota`: requiere cuota pendiente/atrasada; se prellena `valor` con `cuotaPorPagar.valorEsperado`.
  - `abono`: pago parcial sin cuota específica.
- Payload de visita sigue `RegistrarVisitaInput` (`resultado: "pago" | "no_pago"`).

## 7. Checklist financiera

- [ ] Montos con `decimal-pad`, validados con `validarMonto`/`Number.isFinite && > 0`.
- [ ] Cuotas en recuadros; atrasadas con `recuadroCuotaMora`.
- [ ] Badges con `ColorBadge` y colores semánticos.
- [ ] Métodos/motivos desde `catalogos.ts`.
- [ ] WhatsApp con helpers de `estado-cuenta.ts`.
