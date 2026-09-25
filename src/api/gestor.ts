import type {
  ClienteGestorPublic,
  ClienteTarjetaPublic,
  CrearClienteInput,
  CuotaPublic,
  DetalleCuotaPublic,
  TrayectoDiarioApkPublic,
  EstadoCuentaPrestamoPublic,
  EstadisticasCarteraPublic,
  GastoPublic,
  LiquidacionPublic,
  PerfilPublic,
  PrestamoPublic,
  RegistrarGastoInput,
  RegistrarPrestamoInput,
  RegistrarTrayectoriaRealInput,
  RegistrarVisitaInput,
  CarteraApkPublic,
  CarteraNotaPublic,
  NotificacionPublic,
  VisitaPublic,
} from "../types/gestor";
import type { ApiClient } from "./client";
import { construirMultipart } from "./multipart";

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonBody(input: unknown): string {
  return JSON.stringify(input);
}

export interface GestorApi {
  misCarteras(): Promise<CarteraApkPublic[]>;
  notificaciones(): Promise<NotificacionPublic[]>;
  actualizarPerfil(input: {
    nombre: string;
    apellido: string;
  }): Promise<PerfilPublic>;
  trayectoDiario(carteraId: string): Promise<TrayectoDiarioApkPublic>;
  estadisticasCartera(carteraId: string): Promise<EstadisticasCarteraPublic>;
  generarTrayecto(carteraId: string): Promise<unknown>;
  actualizarCliente(
    carteraId: string,
    clienteId: string,
    input: {
      latitud?: number;
      longitud?: number;
      latitudDomicilio?: number | null;
      longitudDomicilio?: number | null;
    },
  ): Promise<ClienteGestorPublic>;
  registrarVisitaPago(
    carteraId: string,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarVisitaNoPago(
    carteraId: string,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarGasto(
    carteraId: string,
    input: RegistrarGastoInput,
    evidencias: { uri: string; name: string; type: string }[],
  ): Promise<GastoPublic>;
  registrarTrayectoriaReal(
    carteraId: string,
    input: RegistrarTrayectoriaRealInput,
  ): Promise<{ id: string; tipo: "real" }>;
  tarjeta(carteraId: string, clienteId: string): Promise<ClienteTarjetaPublic>;
  agregarEvidenciasCliente(
    carteraId: string,
    clienteId: string,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<{ clienteId: string }>;
  listarClientesDeCartera(carteraId: string): Promise<ClienteGestorPublic[]>;
  crearCliente(
    carteraId: string,
    input: CrearClienteInput,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<ClienteGestorPublic>;
  listarNotas(carteraId: string): Promise<CarteraNotaPublic[]>;
  crearNota(carteraId: string, nota: string): Promise<CarteraNotaPublic>;
  obtenerEstadoCuentaPrestamo(
    carteraId: string,
    prestamoId: string,
  ): Promise<EstadoCuentaPrestamoPublic>;
  detalleCuota(
    carteraId: string,
    prestamoId: string,
    cuotaId: string,
  ): Promise<DetalleCuotaPublic>;
  listarPrestamosDeCliente(
    carteraId: string,
    clienteId: string,
  ): Promise<PrestamoPublic[]>;
  crearPrestamo(
    carteraId: string,
    input: RegistrarPrestamoInput,
  ): Promise<PrestamoPublic>;
  editarCuota(
    carteraId: string,
    cuotaId: string,
    input: { valorEsperado?: number; password: string; motivo: string },
  ): Promise<CuotaPublic>;
  eliminarCuota(
    carteraId: string,
    cuotaId: string,
    input: { password: string; motivo: string },
  ): Promise<{ id: string }>;
  eliminarAbono(
    carteraId: string,
    abonoId: string,
    input: { password: string; motivo: string },
  ): Promise<{ id: string }>;
  eliminarPago(
    carteraId: string,
    pagoId: string,
    input: { password: string; motivo: string },
  ): Promise<{ id: string }>;
  generarLiquidacion(
    carteraId: string,
    input: { comentario?: string | null },
  ): Promise<LiquidacionPublic>;
  listarLiquidaciones(carteraId: string): Promise<LiquidacionPublic[]>;
  exportarLiquidacionPdf(carteraId: string, liquidacionId: string): Promise<Uint8Array>;
  registrarApertura(
    carteraId: string,
    input: { latitud?: number; longitud?: number },
  ): Promise<{ id: string; carteraId: string }>;
  registrarPosicion(
    carteraId: string,
    input: { latitud: number; longitud: number },
  ): Promise<{ carteraId: string; latitud: number; longitud: number }>;
  actualizarCartera(
    carteraId: string,
    input: { nombre: string; descripcion?: string | null },
  ): Promise<{ id: string; nombre: string }>;
  actualizarConfiguracionCartera(
    carteraId: string,
    input: { tipoInteres?: number; numCuotas?: number },
  ): Promise<{ id: string; tipoInteres: number; numCuotas: number }>;
}

export function gestorApi(client: ApiClient): GestorApi {
  return {
    misCarteras: () => client.request<CarteraApkPublic[]>("/gestor/mis-carteras"),

    notificaciones: () =>
      client.request<NotificacionPublic[]>("/gestor/notificaciones"),

    actualizarCartera: (
      carteraId: string,
      input: { nombre: string; descripcion?: string | null },
    ) =>
      client.request<{ id: string; nombre: string }>(`/gestor/carteras/${carteraId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    actualizarConfiguracionCartera: (
      carteraId: string,
      input: { tipoInteres?: number; numCuotas?: number },
    ) =>
      client.request<{ id: string; tipoInteres: number; numCuotas: number }>(
        `/gestor/carteras/${carteraId}/configuracion`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    actualizarPerfil: (input: { nombre: string; apellido: string }) =>
      client.request<PerfilPublic>("/perfil", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    actualizarCliente: (
      carteraId: string,
      clienteId: string,
      input: {
        latitud?: number;
        longitud?: number;
        latitudDomicilio?: number | null;
        longitudDomicilio?: number | null;
      },
    ) =>
      client.request<ClienteGestorPublic>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}`,
        {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    trayectoDiario: (carteraId: string) =>
      client.request<TrayectoDiarioApkPublic>(`/gestor/carteras/${carteraId}/trayecto-diario`),

    estadisticasCartera: (carteraId: string) =>
      client.request<EstadisticasCarteraPublic>(`/gestor/carteras/${carteraId}/estadisticas`),

    generarTrayecto: (carteraId: string) =>
      client.request<unknown>(`/gestor/carteras/${carteraId}/trayecto`, {
        method: "POST",
      }),

    registrarVisitaPago: (carteraId: string, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/gestor/carteras/${carteraId}/visitas/pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarVisitaNoPago: (carteraId: string, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/gestor/carteras/${carteraId}/visitas/no-pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarGasto: async (
      carteraId: string,
      input: RegistrarGastoInput,
      evidencias: { uri: string; name: string; type: string }[],
    ) => {
      const { body, boundary } = await construirMultipart(
        { descripcion: input.descripcion, valor: String(input.valor) },
        evidencias.map((archivo) => ({ campo: "evidencias", ...archivo })),
      );
      return client.request<GastoPublic>(`/gestor/carteras/${carteraId}/gastos`, {
        method: "POST",
        body,
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
      });
    },

    registrarTrayectoriaReal: (
      carteraId: string,
      input: RegistrarTrayectoriaRealInput,
    ) =>
      client.request<{ id: string; tipo: "real" }>(
        `/gestor/carteras/${carteraId}/trayectoria-real`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    tarjeta: (carteraId: string, clienteId: string) =>
      client.request<ClienteTarjetaPublic>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/tarjeta`,
      ),

    agregarEvidenciasCliente: async (
      carteraId: string,
      clienteId: string,
      evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
    ) => {
      const { body, boundary } = await construirMultipart({}, evidencias);
      return client.request<{ clienteId: string }>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/evidencias`,
        {
          method: "POST",
          body,
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        },
      );
    },

    listarClientesDeCartera: (carteraId: string) =>
      client.request<ClienteGestorPublic[]>(`/gestor/carteras/${carteraId}/clientes`),

    crearCliente: async (
      carteraId: string,
      input: CrearClienteInput,
      evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
    ) => {
      const campos: Record<string, string> = {
        nombre: input.nombre,
        apellido: input.apellido,
        telefonoWhatsapp: input.telefonoWhatsapp,
        latitud: String(input.latitud),
        longitud: String(input.longitud),
        tipoDocumento: input.tipoDocumento,
        numeroDocumento: input.numeroDocumento,
      };
      if (input.negocio) {
        campos.negocio = input.negocio;
      }
      if (input.topeMaximoDeuda !== undefined) {
        campos.topeMaximoDeuda = String(input.topeMaximoDeuda);
      }
      if (
        input.latitudDomicilio !== undefined &&
        input.longitudDomicilio !== undefined
      ) {
        campos.latitudDomicilio = String(input.latitudDomicilio);
        campos.longitudDomicilio = String(input.longitudDomicilio);
      }
      const { body, boundary } = await construirMultipart(campos, evidencias);
      return client.request<ClienteGestorPublic>(
        `/gestor/carteras/${carteraId}/clientes`,
        {
          method: "POST",
          body,
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        },
      );
    },

    listarNotas: (carteraId: string) =>
      client.request<CarteraNotaPublic[]>(`/gestor/carteras/${carteraId}/notas`),

    crearNota: (carteraId: string, nota: string) =>
      client.request<CarteraNotaPublic>(`/gestor/carteras/${carteraId}/notas`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody({ nota }),
      }),

    obtenerEstadoCuentaPrestamo: (carteraId: string, prestamoId: string) =>
      client.request<EstadoCuentaPrestamoPublic>(
        `/gestor/carteras/${carteraId}/prestamos/${prestamoId}/estado-cuenta`,
      ),

    listarPrestamosDeCliente: (carteraId: string, clienteId: string) =>
      client.request<PrestamoPublic[]>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/prestamos`,
      ),

    detalleCuota: (carteraId: string, prestamoId: string, cuotaId: string) =>
      client.request<DetalleCuotaPublic>(
        `/gestor/carteras/${carteraId}/prestamos/${prestamoId}/cuotas/${cuotaId}/detalle`,
      ),

    crearPrestamo: (carteraId: string, input: RegistrarPrestamoInput) =>
      client.request<PrestamoPublic>(`/gestor/carteras/${carteraId}/prestamos`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    editarCuota: (
      carteraId: string,
      cuotaId: string,
      input: { valorEsperado?: number; password: string; motivo: string },
    ) =>
      client.request<CuotaPublic>(`/gestor/carteras/${carteraId}/cuotas/${cuotaId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarCuota: (
      carteraId: string,
      cuotaId: string,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: string }>(`/gestor/carteras/${carteraId}/cuotas/${cuotaId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarAbono: (
      carteraId: string,
      abonoId: string,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: string }>(`/gestor/carteras/${carteraId}/abonos/${abonoId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarPago: (
      carteraId: string,
      pagoId: string,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: string }>(`/gestor/carteras/${carteraId}/pagos/${pagoId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    generarLiquidacion: (carteraId: string, input: { comentario?: string | null }) =>
      client.request<LiquidacionPublic>(`/gestor/carteras/${carteraId}/liquidaciones`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    listarLiquidaciones: (carteraId: string) =>
      client.request<LiquidacionPublic[]>(`/gestor/carteras/${carteraId}/liquidaciones`),

    exportarLiquidacionPdf: (carteraId: string, liquidacionId: string) =>
      client.requestBytes(
        `/gestor/carteras/${carteraId}/liquidaciones/${liquidacionId}/export-pdf`,
      ),

    registrarApertura: (
      carteraId: string,
      input: { latitud?: number; longitud?: number },
    ) =>
      client.request<{ id: string; carteraId: string }>(
        `/gestor/carteras/${carteraId}/apertura`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    registrarPosicion: (
      carteraId: string,
      input: { latitud: number; longitud: number },
    ) =>
      client.request<{ carteraId: string; latitud: number; longitud: number }>(
        `/gestor/carteras/${carteraId}/posicion`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),
  };
}