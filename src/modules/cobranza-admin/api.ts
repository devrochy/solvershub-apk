import type { ClienteAdmin } from "@core/api/admin";

/**
 * API admin del pack de cobranza (HU-APP-18 · réplica total).
 * Contrato: /api/v1/pack/cobranza/* (verificado contra el OpenAPI del backend).
 */

export interface Kpi { label: string; value: string }
export interface ClientRow {
  id: string; nombre: string; apellido: string | null; telefono: string | null;
  tipo_documento: string | null; numero_documento: string | null; negocio: string | null;
  cartera: string | null; cartera_id: string | null; tope_maximo_deuda: string | null;
  color_riesgo: string;
}
export interface CuotaOut { id: string; monto: string; fecha_vencimiento: string | null; estado: string; saldo: string; numero: number }
export interface Loan {
  id: string; valor: string; saldo: string; num_cuotas: number; tipo_interes: string;
  fecha_otorgado: string | null; estatus: string; cuotas: CuotaOut[];
}
export interface ClientMovement { id: string; tipo: string; fecha: string; valor: string; metodo: string | null }
export interface ClientChange {
  id: string; campos_propuestos: Record<string, unknown>; estado: string;
  solicitado_por: string | null; fecha: string; motivo_rechazo: string | null;
}
export interface ClientDetail { cliente: ClientRow; prestamos: Loan[]; movimientos: ClientMovement[]; cambios: ClientChange[] }
export interface PagoAdmin {
  id: string; cliente: string; valor: string; metodo_pago: string | null;
  registrado_por: string | null; fecha_hora: string;
}
export interface PromesaAdmin {
  id: string; cliente: string; fecha_prometida: string | null; valor_prometido: string;
  estado: string; tipo: string | null; creado_por: string | null;
}
export interface DeviceRow {
  id: string; codigo: string | null; gestor: string | null; imei: string | null;
  whatsapp: string | null; estado: string; vinculado: boolean;
}
export interface Dispositivos { pendientes: number; dispositivos: DeviceRow[]; intentos: unknown[]; eventos: unknown[] }
export interface FilaAuditoria {
  fecha: string; entidad: string; entidad_id: string | null; operacion: string;
  antes: unknown; despues: unknown; actor: string | null; motivo: string | null;
}
export interface AuditoriaCobranza { entidades: string[]; operaciones: string[]; filas: FilaAuditoria[] }

export async function cargarResumen(api: ClienteAdmin): Promise<{ kpis: Kpi[] }> {
  return api.get("/pack/cobranza/summary");
}

export async function cargarClientes(api: ClienteAdmin, q?: string): Promise<ClientRow[]> {
  return api.get("/pack/cobranza/clients", { q });
}

export async function cargarDetalleCliente(api: ClienteAdmin, id: string): Promise<ClientDetail> {
  return api.get(`/pack/cobranza/clients/${id}`);
}

export async function cargarPagos(api: ClienteAdmin): Promise<PagoAdmin[]> {
  return api.get("/pack/cobranza/payments");
}

export async function cargarPromesas(api: ClienteAdmin): Promise<PromesaAdmin[]> {
  return api.get("/pack/cobranza/promises");
}

export async function cambiarEstadoPromesa(
  api: ClienteAdmin,
  id: string,
  estado: string,
): Promise<void> {
  await api.post(`/pack/cobranza/promises/${id}/status`, { estado });
}

export async function cargarDispositivos(api: ClienteAdmin): Promise<Dispositivos> {
  return api.get("/pack/cobranza/devices");
}

export async function cambiarEstadoDispositivo(
  api: ClienteAdmin,
  id: string,
  estado: string,
): Promise<void> {
  await api.post(`/pack/cobranza/devices/${id}/status`, { estado });
}

export async function cargarAuditoria(api: ClienteAdmin): Promise<AuditoriaCobranza> {
  return api.get("/pack/cobranza/audit");
}

export async function decidirCambioCliente(
  api: ClienteAdmin,
  id: string,
  decision: string,
  motivo?: string,
): Promise<void> {
  await api.post(`/pack/cobranza/client-changes/${id}/decision`, { decision, motivo: motivo ?? "" });
}
