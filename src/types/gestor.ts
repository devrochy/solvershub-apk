import type { GestorPermisoNombre } from "./gestor-permisos";
import type { TipoDocumento } from "../domain/tipo-documento";

export type ColorRiesgo = "azul" | "rojo" | "blanco";
export type ColorListaDelDia = "verde" | "rojo" | "blanco";
export type GastoEstado = "activo" | "eliminado";
export type TipoTrayecto = "planificada" | "real";
export type VisitaResultado = "pago" | "no_pago";

export interface PerfilPublic {
  id: string;
  usuario: string;
  nombre: string;
  apellido: string;
}

export interface GestorPermisoEstado {
  permiso: GestorPermisoNombre;
  habilitado: boolean;
}

export interface CarteraConfigPublic {
  carteraId: string;
  cuotasMinimasPrestamo: number;
  cuotasAtrasoUmbral: number;
  manejoCupoActivo: boolean;
  cupoDefault: number;
  recargoActivo: boolean;
  bloquearCambioInteres: boolean;
  comisionActiva: boolean;
  comisionPorcentaje: number;
  mostrarFechaUltimaLiquidada: boolean;
  mostrarCaja: boolean;
  mostrarCobradoLiquidada: boolean;
  mostrarPrestamos: boolean;
  eliminarPrestamosApk: boolean;
  reconocimientoFacialActivo: boolean;
  registroDocumentoCliente: boolean;
  eliminarPagosApk: boolean;
  eliminarGastosApk: boolean;
  eliminarInyeccionApk: boolean;
  eliminarAbonosApk: boolean;
  registrarInyeccionApk: boolean;
  generarReportesApk: boolean;
  ocultarCartera: boolean;
  mostrarCobroEstimado: boolean;
  bloqueoAutomaticoClientes: boolean;
  permitirCambioFechaPrestamo: boolean;
  borrarClientesSinDeuda: boolean;
  periodoLiquidacion: "diario" | "semanal" | "quincenal" | "mensual";
  diasNoLaborables: "solo_domingos" | "domingos_y_feriados";
  metodosPago: string[];
  diasAnticipacionNotificacion: number;
  avisoDiaCobro: boolean;
  umbralMoraNotificacion: number;
}

export interface CarteraApkPublic {
  id: string;
  nombre: string;
  estatus: string;
  tipoInteres: number;
  numCuotas: number;
  /** Cobro con QR/link habilitado por el propietario (ADR-0067). */
  pagoQrActivo?: boolean;
  config: CarteraConfigPublic;
  permisos: GestorPermisoEstado[];
}

/** Resultado de crear el link/QR de cobro de una cuota (ADR-0067). */
export interface LinkPagoCobro {
  modo: "online" | "informativo";
  monto: number;
  referencia?: string;
  url?: string | null;
  /** QR como data URI PNG (o null si no se pudo generar). */
  qrPng: string | null;
  metodos?: string[];
  titular?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  alias?: string;
  nota?: string;
}

export interface ClienteTrayectoDiarioPublic {
  clienteId: string;
  nombre: string;
  /** Coordenadas del negocio (para "cliente cercano"). */
  latitud?: number | null;
  longitud?: number | null;
  enTrayecto: boolean;
  color: ColorListaDelDia;
  visitaRegistrada: boolean;
  diasMora: number;
  compromisoValor: number | null;
}

export interface ParadaGeo {
  clienteId: string;
  latitud?: number;
  longitud?: number;
}

export type Trayecto = ParadaGeo[];

export interface TrayectoPublic {
  id: string;
  carteraId: string;
  fecha: string;
  ordenClientes: Trayecto[];
  waypoints: { latitud: number; longitud: number }[];
  distanciaEstimadaKm: number;
  tiempoEstimadoMin: number;
  tipo: TipoTrayecto;
}

export interface TrayectoDiarioApkPublic {
  clientes: ClienteTrayectoDiarioPublic[];
  trayectos: TrayectoPublic | null;
}

export interface VisitaPublic {
  id: string;
  carteraId: string;
  clienteId: string;
  prestamoPrincipalId: string;
  fecha: string;
  resultado: VisitaResultado;
  motivoNoPago: string | null;
  valorPagado: number | null;
  metodoPago: string | null;
}

export interface GastoEvidenciaPublic {
  id: string;
  gastoId: string;
  nombreOriginal: string;
  mimetype: string;
  tamaño: number;
  carteraArchivo: string;
}

export interface GastoPublic {
  id: string;
  carteraId: string;
  descripcion: string;
  valor: number;
  aprobado: boolean;
  aprobadoPor: number | null;
  estado: GastoEstado;
  fechaHora: string;
  evidencias: GastoEvidenciaPublic[];
}

export interface ClienteTarjetaPublic {
  clienteId: string;
  carteraId: string;
  nombre: string;
  negocio: string | null;
  telefonoWhatsapp: string;
  color: ColorRiesgo;
  fotoUrl: string | null;
  /** URL del frente del documento de identidad (si el backend la expone). */
  documentoFrenteUrl?: string | null;
  /** URL del reverso del documento de identidad (si el backend la expone). */
  documentoReversoUrl?: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  latitud?: number;
  longitud?: number;
  latitudDomicilio?: number | null;
  longitudDomicilio?: number | null;
  tipoPago: string | null;
  saldoPendiente: number;
  diasMora: number;
}

export interface CarteraNotaPublic {
  id: string;
  carteraId: string;
  nota: string;
  creadoPorRol: string;
  creadoPorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface EstadisticasConteosPublic {
  totalClientes: number;
  clientesAtrasados: number;
  clientesVencidos: number;
  sinVisitaHoy: number;
  sinVisitaDesdeUltimaLiquidada: number;
  conPrestamosNuevos: number;
  conMasDeUnPrestamo: number;
  clientesNuevos: number;
}

export interface EstadisticasCarteraPublic {
  carteraId: string;
  fecha: string;
  actual: EstadisticasConteosPublic;
  anterior: EstadisticasConteosPublic | null;
  deltas: Record<keyof EstadisticasConteosPublic, number | null>;
  actualizadoEn: string;
}

export interface CrearClienteInput {
  nombre: string;
  apellido: string;
  negocio?: string;
  telefonoWhatsapp: string;
  latitud: number;
  longitud: number;
  topeMaximoDeuda?: number;
  latitudDomicilio?: number;
  longitudDomicilio?: number;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
}

export interface ClienteGestorPublic {
  id: string;
  carteraId: string;
  nombre: string;
  apellido: string;
  negocio: string | null;
  telefonoWhatsapp: string;
  latitud: number;
  longitud: number;
  latitudDomicilio: number | null;
  longitudDomicilio: number | null;
  topeMaximoDeuda: number | null;
  estatus: string;
  colorRiesgo: ColorRiesgo;
  fotoUrl: string | null;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  /** Préstamos vigentes del cliente (para filtros de la lista). */
  numPrestamos: number;
  /** Días de mora (desde la cuota vencida más antigua). */
  diasMora: number;
  createdAt: string;
}

export type NotificacionTipo =
  | "pago"
  | "gasto"
  | "no_pago"
  | "aprobacion"
  | "liquidacion";

export interface NotificacionPublic {
  id: string;
  tipo: NotificacionTipo;
  mensaje: string;
  carteraId: string;
  carteraNombre: string;
  clienteId: string | null;
  monto: number | null;
  fecha: string;
}

export type CuotaEstatus = "pendiente" | "pagada" | "atrasada";
export type PrestamoEstatus = "vigente" | "liquidado" | "cancelado";

export interface CuotaPublic {
  id: string;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
}

export interface PrestamoPublic {
  id: string;
  carteraId: string;
  clienteId: string;
  valor: number;
  numCuotas: number;
  tipoInteres: number;
  diasEntreCuotas: number;
  fechaOtorgado: string;
  estatus: PrestamoEstatus;
  cuotas: CuotaPublic[];
}

export interface PagoCuotaPublic {
  id: string;
  valor: number;
  metodoPago: string;
  fechaHora: string;
  registradoPor: number | null;
  liquidado: boolean;
}

export interface AbonoCuotaPublic {
  id: string;
  valor: number;
  fechaHora: string;
  liquidado: boolean;
}

export interface UltimaVisitaCuotaPublic {
  resultado: VisitaResultado;
  motivoNoPago: string | null;
  fecha: string;
}

export interface DetalleCuotaPublic {
  cuotaId: string;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
  abonosAcumulados: number;
  saldoPendiente: number;
  pagos: PagoCuotaPublic[];
  abonos: AbonoCuotaPublic[];
  ultimaVisita: UltimaVisitaCuotaPublic | null;
}

export interface ItemLiquidacionDetalle {
  id: string;
  clienteId: string;
  clienteNombre: string;
  valor: number;
  metodoPago: string;
  fechaHora: string;
  liquidado: boolean;
}

export interface LiquidacionPublic {
  id: string;
  carteraId: string;
  fecha: string;
  periodo: string;
  cajaAnterior: number;
  cajaActual: number;
  estimadoACobrar: number;
  totalInyeccion: number;
  totalCobradoPeriodo: number;
  totalCobradoDia: number;
  totalPrestado: number;
  totalGastos: number;
  sumaCartera: number;
  comisionPorcentaje: number;
  comisionValor: number;
  comentario: string | null;
  createdAt: string;
  pagos: ItemLiquidacionDetalle[];
  abonos: ItemLiquidacionDetalle[];
  /** KPIs del día (REQ-APK-003). */
  pagaron: number;
  faltan: number;
  totalDia: number;
  sinCuentas: number;
  horaPrimera: string | null;
  horaUltima: string | null;
}

export interface CuotaEstado {
  cuotaId: string;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
  abonosAcumulados: number;
  saldoPendiente: number;
}

export interface EstadoCuentaPrestamoPublic {
  prestamoId: string;
  carteraId: string;
  clienteId: string;
  nombreCliente: string;
  valor: number;
  numCuotas: number;
  tipoInteres: number;
  estatus: string;
  moneda: string;
  cuotas: CuotaEstado[];
  totalAbonos: number;
  saldoPendiente: number;
  proximoVencimiento: string | null;
}

export interface RegistrarVisitaInput {
  prestamoId: string;
  clienteId: string;
  resultado: VisitaResultado;
  tipoPago?: "cuota" | "abono";
  cuotaId?: string;
  valor?: number;
  metodoPago?: string;
  motivoNoPago?: string;
  fechaPrometida?: string;
  valorPrometido?: number;
}

export interface RegistrarGastoInput {
  descripcion: string;
  valor: number;
}

export interface RegistrarPrestamoInput {
  clienteId: string;
  valor: number;
  numCuotas: number;
  tipoInteres?: number;
  diasEntreCuotas: number;
  fiadorNombre?: string;
  fiadorApellido?: string;
  fiadorDocumento?: string;
  fiadorTelefono?: string;
}

export interface RegistrarTrayectoriaRealInput {
  puntos: { latitud: number; longitud: number }[];
}