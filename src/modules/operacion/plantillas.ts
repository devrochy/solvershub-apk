/** Plantillas aprobadas de WhatsApp: cuerpo con variables y validación de faltantes. */

export function rellenarCuerpo(cuerpo: string, valores: Record<string, string>): string {
  return cuerpo.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_m, nombre: string) => {
    const valor = valores[nombre]?.trim();
    return valor ? valor : `[${nombre}]`;
  });
}

export function faltantes(variables: string[], valores: Record<string, string>): string[] {
  return variables.filter((v) => !valores[v]?.trim());
}
