export const METODOS_PAGO = [
  "efectivo",
  "transferencia",
  "qr",
  "tarjeta",
  "deposito",
] as const;

export const MOTIVOS_NO_PAGO = [
  "no_esta",
  "no_tiene_dinero",
  "se_volo",
  "pago_ya",
  "no_hay_nadie",
  "se_traslado",
  "esta_enfermo",
  "compromiso_de_pago",
] as const;