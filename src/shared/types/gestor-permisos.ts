export const GESTOR_PERMISOS = [
  "registrar_prestamo",
  "registrar_pago",
  "registrar_abono",
  "registrar_gasto",
  "registrar_no_pago",
  "anotar_notas_cartera",
  "actualizar_cliente",
  "eliminar_prestamo",
  "eliminar_pago",
  "eliminar_abono",
  "eliminar_gasto",
  "registrar_inyeccion",
  "ver_cartera",
  "generar_reporte",
  "actualizar_cartera",
] as const;

export type GestorPermisoNombre = (typeof GESTOR_PERMISOS)[number];