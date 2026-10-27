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

export async function cargarClientes(api: ClienteAdmin, q?: string, carteraId?: string): Promise<ClientRow[]> {
  return api.get("/pack/cobranza/clients", { q, cartera_id: carteraId });
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

// ---------------- HU-APP-19 · cobranza admin profunda ----------------

export interface CarteraCaja { saldo_inicial: number; saldo_actual: number; actualizado: string }
export interface LiquidacionOut { cartera: string; fecha: string; periodo: string; cobrado: number; gastos: number; comision: number }
export interface InjectionOut { fecha: string; valor: number; comentario: string; estado: string }
export interface ReportRow {
  cartera: string; clientes: number; prestamos: number; saldo: number;
  vencidas: number; cobrado: number; caja: number; gastos: number;
}
export interface Reportes { filas: ReportRow[]; liquidaciones: LiquidacionOut[] }
export interface Monitoring {
  conversaciones: number; escalaciones: number; promesas_pendientes: number;
  promesas_cumplidas: number; promesas_incumplidas: number; ultimas_promesas: PromesaAdmin[];
}
export interface Reglas {
  max_dias_prorroga: number; min_abono_pct: number; max_reprogramaciones: number;
  umbral_saldo_autonomo: number;
}
export interface AccessAttempt {
  fecha: string; gestor: string; resultado: string; motivo: string; imei: string; critico: boolean;
}
export interface Alertas { total: number; denegados: number; items: AccessAttempt[] }
export interface RouteClient {
  id: string; cliente: string; telefono: string; saldo: number; mora: number;
  riesgo: string; lat: number | null; lng: number | null;
}
export interface RoutePlan { orden: string[]; distancia_km: number; tiempo_min: number; fecha: string }
export interface Ruta { clientes: RouteClient[]; plan: RoutePlan | null }
export interface PortfolioRow {
  id: string; nombre: string; descripcion: string | null; gestor: string | null;
  gestor_id: string | null; tipo_interes: number; num_cuotas: number; moneda: string;
  estatus: string; costo_cobro: number;
}

export async function cargarCarteras(api: ClienteAdmin): Promise<PortfolioRow[]> {
  return api.get("/pack/cobranza/portfolios");
}

export async function cargarCaja(api: ClienteAdmin, id: string): Promise<CarteraCaja> {
  return api.get(`/pack/cobranza/portfolios/${id}/cash`);
}

export async function ajustarCaja(api: ClienteAdmin, id: string, valorNuevo: number, motivo: string): Promise<void> {
  await api.post(`/pack/cobranza/portfolios/${id}/cash/adjustment`, { valor_nuevo: valorNuevo, motivo });
}

export async function cerrarCaja(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/pack/cobranza/portfolios/${id}/cash/closing`);
}

export async function abrirCaja(api: ClienteAdmin, id: string): Promise<void> {
  await api.post(`/pack/cobranza/portfolios/${id}/cash/opening`);
}

export async function inyectarCapital(api: ClienteAdmin, id: string, valor: number, comentario: string): Promise<void> {
  await api.post(`/pack/cobranza/portfolios/${id}/injections`, { valor, comentario });
}

export async function liquidarCartera(api: ClienteAdmin, id: string, periodo: string): Promise<void> {
  await api.post(`/pack/cobranza/portfolios/${id}/liquidations`, { periodo });
}

export async function cargarRuta(api: ClienteAdmin, id: string): Promise<Ruta> {
  return api.get(`/pack/cobranza/portfolios/${id}/route`);
}

export async function optimizarRuta(api: ClienteAdmin, id: string): Promise<Ruta> {
  return api.post(`/pack/cobranza/portfolios/${id}/route/optimize`);
}

export async function cargarReportes(api: ClienteAdmin): Promise<Reportes> {
  return api.get("/pack/cobranza/reports");
}

export async function cargarMonitoreo(api: ClienteAdmin): Promise<Monitoring> {
  return api.get("/pack/cobranza/monitoring");
}

export async function cargarReglas(api: ClienteAdmin): Promise<Reglas> {
  return api.get("/pack/cobranza/rules");
}

export async function guardarReglas(api: ClienteAdmin, reglas: Reglas): Promise<void> {
  await api.put("/pack/cobranza/rules", reglas);
}

export async function cargarAlertas(api: ClienteAdmin): Promise<Alertas> {
  return api.get("/pack/cobranza/alerts");
}

// ---------------- Cierre de réplica: Gestores ----------------

export interface GestorOut {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigo: string | null;
  estatus: string;
}

export interface PermisosGestor {
  catalogo: string[];
  activos: string[];
}

export async function cargarGestores(api: ClienteAdmin): Promise<GestorOut[]> {
  return api.get<GestorOut[]>("/pack/cobranza/collectors");
}

export async function crearGestor(
  api: ClienteAdmin,
  datos: { nombre: string; apellido?: string; correo?: string; telefono?: string; password?: string },
): Promise<{ resultado: string }> {
  return api.post<{ resultado: string }>("/pack/cobranza/collectors", datos);
}

export async function editarGestor(
  api: ClienteAdmin,
  id: string,
  datos: { nombre: string; apellido?: string; correo?: string; telefono?: string },
): Promise<GestorOut> {
  return api.put<GestorOut>(`/pack/cobranza/collectors/${id}`, datos);
}

export async function eliminarGestor(api: ClienteAdmin, id: string): Promise<void> {
  await api.del(`/pack/cobranza/collectors/${id}`);
}

export async function cargarPermisosGestor(
  api: ClienteAdmin,
  id: string,
): Promise<PermisosGestor> {
  return api.get<PermisosGestor>(`/pack/cobranza/collectors/${id}/permissions`);
}

export async function guardarPermisosGestor(
  api: ClienteAdmin,
  id: string,
  permisos: string[],
): Promise<PermisosGestor> {
  return api.put<PermisosGestor>(`/pack/cobranza/collectors/${id}/permissions`, { permisos });
}
