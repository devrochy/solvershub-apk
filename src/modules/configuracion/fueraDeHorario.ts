/**
 * Ayuda del campo «Mensaje fuera de horario»: qué recibe el cliente si escribe fuera del
 * horario de atención (adenda 2026-10-18 de ADR-0051 en agent-core). Igual a la del panel.
 */
export function ayudaFueraDeHorario(mensaje: string, porDefecto: string, hayHorario: boolean): string {
  if (!hayHorario) {
    return "Sin horario de atención, el asistente responde siempre y este mensaje no se usa.";
  }
  if (mensaje.trim()) {
    return "Fuera de horario, el cliente recibe este mensaje cada vez que escribe, sin pasar por la IA. {assistant_name} se reemplaza por el nombre del asistente.";
  }
  const aviso = porDefecto.trim() ? `: «${porDefecto.trim()}»` : "";
  return `Vacío: fuera de horario, el cliente recibe el mensaje por defecto una vez por conversación cada 12 horas${aviso}`;
}
