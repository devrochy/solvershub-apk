export const COBRADOR_PERMISOS = [
  "registrar_prestamo",
  "registrar_pago",
  "registrar_abono",
  "registrar_gasto",
  "registrar_no_pago",
  "anotar_notas_ruta",
  "actualizar_cliente",
  "eliminar_prestamo",
  "eliminar_pago",
  "eliminar_abono",
  "eliminar_gasto",
  "registrar_inyeccion",
  "ver_cartera",
  "generar_reporte",
] as const;

export type CobradorPermisoNombre = (typeof COBRADOR_PERMISOS)[number];