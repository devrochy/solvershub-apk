import type { CobradorPermisoNombre } from "./cobrador-permisos";
import type { TipoDocumento } from "../domain/tipo-documento";

export type ColorRiesgo = "azul" | "rojo" | "blanco";
export type ColorListaDelDia = "verde" | "rojo" | "blanco";
export type GastoEstado = "activo" | "eliminado";
export type TipoTrayecto = "planificada" | "real";
export type VisitaResultado = "pago" | "no_pago";

export interface PerfilPublic {
  id: number;
  usuario: string;
  nombre: string;
  apellido: string;
}

export interface CobradorPermisoEstado {
  permiso: CobradorPermisoNombre;
  habilitado: boolean;
}

export interface RutaConfigPublic {
  rutaId: number;
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

export interface RutaApkPublic {
  id: number;
  nombre: string;
  estatus: string;
  tipoInteres: number;
  numCuotas: number;
  config: RutaConfigPublic;
  permisos: CobradorPermisoEstado[];
}

export interface ClienteDiaPublic {
  clienteId: number;
  nombre: string;
  enTrayecto: boolean;
  color: ColorListaDelDia;
  visitaRegistrada: boolean;
  diasMora: number;
  compromisoValor: number | null;
}

export interface ParadaGeo {
  clienteId: number;
  latitud?: number;
  longitud?: number;
}

export type Trayecto = ParadaGeo[];

export interface TrayectoPublic {
  id: number;
  rutaId: number;
  fecha: string;
  ordenClientes: Trayecto[];
  waypoints: { latitud: number; longitud: number }[];
  distanciaEstimadaKm: number;
  tiempoEstimadoMin: number;
  tipo: TipoTrayecto;
}

export interface DiaApkPublic {
  clientes: ClienteDiaPublic[];
  trayectos: TrayectoPublic | null;
}

export interface VisitaPublic {
  id: number;
  rutaId: number;
  clienteId: number;
  prestamoPrincipalId: number;
  fecha: string;
  resultado: VisitaResultado;
  motivoNoPago: string | null;
  valorPagado: number | null;
  metodoPago: string | null;
}

export interface GastoEvidenciaPublic {
  id: number;
  gastoId: number;
  nombreOriginal: string;
  mimetype: string;
  tamaño: number;
  rutaArchivo: string;
}

export interface GastoPublic {
  id: number;
  rutaId: number;
  descripcion: string;
  valor: number;
  aprobado: boolean;
  aprobadoPor: number | null;
  estado: GastoEstado;
  fechaHora: string;
  evidencias: GastoEvidenciaPublic[];
}

export interface ClienteTarjetaPublic {
  clienteId: number;
  rutaId: number;
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
  tipoPago: string | null;
  saldoPendiente: number;
  diasMora: number;
}

export interface RutaNotaPublic {
  id: number;
  rutaId: number;
  nota: string;
  creadoPorRol: string;
  creadoPorId: number;
  createdAt: string;
  updatedAt: string;
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

export interface ClienteCobradorPublic {
  id: number;
  rutaId: number;
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
  createdAt: string;
}

export type CuotaEstatus = "pendiente" | "pagada" | "atrasada";
export type PrestamoEstatus = "vigente" | "liquidado" | "cancelado";

export interface CuotaPublic {
  id: number;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
}

export interface PrestamoPublic {
  id: number;
  rutaId: number;
  clienteId: number;
  valor: number;
  numCuotas: number;
  tipoInteres: number;
  diasEntreCuotas: number;
  fechaOtorgado: string;
  estatus: PrestamoEstatus;
  cuotas: CuotaPublic[];
}

export interface PagoCuotaPublic {
  id: number;
  valor: number;
  metodoPago: string;
  fechaHora: string;
  registradoPor: number | null;
  liquidado: boolean;
}

export interface AbonoCuotaPublic {
  id: number;
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
  cuotaId: number;
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
  id: number;
  clienteId: number;
  clienteNombre: string;
  valor: number;
  metodoPago: string;
  fechaHora: string;
  liquidado: boolean;
}

export interface LiquidacionPublic {
  id: number;
  rutaId: number;
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
}

export interface CuotaEstado {
  cuotaId: number;
  numeroCuota: number;
  valorEsperado: number;
  fechaVencimiento: string;
  estatus: CuotaEstatus;
  abonosAcumulados: number;
  saldoPendiente: number;
}

export interface EstadoCuentaPrestamoPublic {
  prestamoId: number;
  rutaId: number;
  clienteId: number;
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
  prestamoId: number;
  clienteId: number;
  resultado: VisitaResultado;
  tipoPago?: "cuota" | "abono";
  cuotaId?: number;
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
  clienteId: number;
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