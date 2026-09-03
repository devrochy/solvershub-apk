export interface PaisTelefono {
  codigo: string;
  nombre: string;
  prefijo: string;
  bandera: string;
}

/**
 * Catálogo de países con prefijo telefónico internacional y bandera (emoji).
 * Se usa en los formularios de teléfono (nuevo cliente, editar cliente) para
 * que el cobrador seleccione el país y solo escriba el número local. Sin
 * dependencias externas (emojis nativos).
 */
export const PAISES_TELEFONO: PaisTelefono[] = [
  { codigo: "BO", nombre: "Bolivia", prefijo: "+591", bandera: "🇧🇴" },
  { codigo: "CO", nombre: "Colombia", prefijo: "+57", bandera: "🇨🇴" },
  { codigo: "MX", nombre: "México", prefijo: "+52", bandera: "🇲🇽" },
  { codigo: "PE", nombre: "Perú", prefijo: "+51", bandera: "🇵🇪" },
  { codigo: "EC", nombre: "Ecuador", prefijo: "+593", bandera: "🇪🇨" },
  { codigo: "CL", nombre: "Chile", prefijo: "+56", bandera: "🇨🇱" },
  { codigo: "AR", nombre: "Argentina", prefijo: "+54", bandera: "🇦🇷" },
  { codigo: "UY", nombre: "Uruguay", prefijo: "+598", bandera: "🇺🇾" },
  { codigo: "PY", nombre: "Paraguay", prefijo: "+595", bandera: "🇵🇾" },
  { codigo: "VE", nombre: "Venezuela", prefijo: "+58", bandera: "🇻🇪" },
  { codigo: "PA", nombre: "Panamá", prefijo: "+507", bandera: "🇵🇦" },
  { codigo: "CR", nombre: "Costa Rica", prefijo: "+506", bandera: "🇨🇷" },
  { codigo: "GT", nombre: "Guatemala", prefijo: "+502", bandera: "🇬🇹" },
  { codigo: "SV", nombre: "El Salvador", prefijo: "+503", bandera: "🇸🇻" },
  { codigo: "HN", nombre: "Honduras", prefijo: "+504", bandera: "🇭🇳" },
  { codigo: "NI", nombre: "Nicaragua", prefijo: "+505", bandera: "🇳🇮" },
  { codigo: "US", nombre: "Estados Unidos", prefijo: "+1", bandera: "🇺🇸" },
  { codigo: "DO", nombre: "Rep. Dominicana", prefijo: "+1", bandera: "🇩🇴" },
  { codigo: "ES", nombre: "España", prefijo: "+34", bandera: "🇪🇸" },
  { codigo: "BR", nombre: "Brasil", prefijo: "+55", bandera: "🇧🇷" },
];

/** País por defecto para formularios nuevos. */
export const PAIS_DEFECTO_TELEFONO: PaisTelefono = PAISES_TELEFONO[0];

/**
 * Infiere el país a partir de un número internacional (p. ej. "+5917000111").
 * Devuelve null si no coincide con ningún prefijo del catálogo. Ante prefijos
 * compartidos (p. ej. +1 para US y DO) elige el de mayor longitud que coincida.
 */
export function paisDesdeTelefono(
  telefono: string,
): PaisTelefono | null {
  const limpio = telefono.trim();
  if (!limpio.startsWith("+")) {
    return null;
  }
  const coincidencias = PAISES_TELEFONO.filter((p) =>
    limpio.startsWith(p.prefijo),
  ).sort((a, b) => b.prefijo.length - a.prefijo.length);
  return coincidencias[0] ?? null;
}