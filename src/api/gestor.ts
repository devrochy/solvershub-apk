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
  trayectoDiario(carteraId: number): Promise<TrayectoDiarioApkPublic>;
  estadisticasCartera(carteraId: number): Promise<EstadisticasCarteraPublic>;
  generarTrayecto(carteraId: number): Promise<unknown>;
  actualizarCliente(
    carteraId: number,
    clienteId: number,
    input: {
      latitud?: number;
      longitud?: number;
      latitudDomicilio?: number | null;
      longitudDomicilio?: number | null;
    },
  ): Promise<ClienteGestorPublic>;
  registrarVisitaPago(
    carteraId: number,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarVisitaNoPago(
    carteraId: number,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarGasto(
    carteraId: number,
    input: RegistrarGastoInput,
    evidencias: { uri: string; name: string; type: string }[],
  ): Promise<GastoPublic>;
  registrarTrayectoriaReal(
    carteraId: number,
    input: RegistrarTrayectoriaRealInput,
  ): Promise<{ id: number; tipo: "real" }>;
  tarjeta(carteraId: number, clienteId: number): Promise<ClienteTarjetaPublic>;
  agregarEvidenciasCliente(
    carteraId: number,
    clienteId: number,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<{ clienteId: number }>;
  listarClientesDeCartera(carteraId: number): Promise<ClienteGestorPublic[]>;
  crearCliente(
    carteraId: number,
    input: CrearClienteInput,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<ClienteGestorPublic>;
  listarNotas(carteraId: number): Promise<CarteraNotaPublic[]>;
  crearNota(carteraId: number, nota: string): Promise<CarteraNotaPublic>;
  obtenerEstadoCuentaPrestamo(
    carteraId: number,
    prestamoId: number,
  ): Promise<EstadoCuentaPrestamoPublic>;
  detalleCuota(
    carteraId: number,
    prestamoId: number,
    cuotaId: number,
  ): Promise<DetalleCuotaPublic>;
  listarPrestamosDeCliente(
    carteraId: number,
    clienteId: number,
  ): Promise<PrestamoPublic[]>;
  crearPrestamo(
    carteraId: number,
    input: RegistrarPrestamoInput,
  ): Promise<PrestamoPublic>;
  editarCuota(
    carteraId: number,
    cuotaId: number,
    input: { valorEsperado?: number; password: string; motivo: string },
  ): Promise<CuotaPublic>;
  eliminarCuota(
    carteraId: number,
    cuotaId: number,
    input: { password: string; motivo: string },
  ): Promise<{ id: number }>;
  eliminarAbono(
    carteraId: number,
    abonoId: number,
    input: { password: string; motivo: string },
  ): Promise<{ id: number }>;
  eliminarPago(
    carteraId: number,
    pagoId: number,
    input: { password: string; motivo: string },
  ): Promise<{ id: number }>;
  generarLiquidacion(
    carteraId: number,
    input: { comentario?: string | null },
  ): Promise<LiquidacionPublic>;
  listarLiquidaciones(carteraId: number): Promise<LiquidacionPublic[]>;
  exportarLiquidacionPdf(carteraId: number, liquidacionId: number): Promise<Uint8Array>;
  registrarApertura(
    carteraId: number,
    input: { latitud?: number; longitud?: number },
  ): Promise<{ id: number; carteraId: number }>;
  registrarPosicion(
    carteraId: number,
    input: { latitud: number; longitud: number },
  ): Promise<{ carteraId: number; latitud: number; longitud: number }>;
  actualizarCartera(
    carteraId: number,
    input: { nombre: string; descripcion?: string | null },
  ): Promise<{ id: number; nombre: string }>;
  actualizarConfiguracionCartera(
    carteraId: number,
    input: { tipoInteres?: number; numCuotas?: number },
  ): Promise<{ id: number; tipoInteres: number; numCuotas: number }>;
}

export function gestorApi(client: ApiClient): GestorApi {
  return {
    misCarteras: () => client.request<CarteraApkPublic[]>("/gestor/mis-carteras"),

    notificaciones: () =>
      client.request<NotificacionPublic[]>("/gestor/notificaciones"),

    actualizarCartera: (
      carteraId: number,
      input: { nombre: string; descripcion?: string | null },
    ) =>
      client.request<{ id: number; nombre: string }>(`/gestor/carteras/${carteraId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    actualizarConfiguracionCartera: (
      carteraId: number,
      input: { tipoInteres?: number; numCuotas?: number },
    ) =>
      client.request<{ id: number; tipoInteres: number; numCuotas: number }>(
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
      carteraId: number,
      clienteId: number,
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

    trayectoDiario: (carteraId: number) =>
      client.request<TrayectoDiarioApkPublic>(`/gestor/carteras/${carteraId}/trayecto-diario`),

    estadisticasCartera: (carteraId: number) =>
      client.request<EstadisticasCarteraPublic>(`/gestor/carteras/${carteraId}/estadisticas`),

    generarTrayecto: (carteraId: number) =>
      client.request<unknown>(`/gestor/carteras/${carteraId}/trayecto`, {
        method: "POST",
      }),

    registrarVisitaPago: (carteraId: number, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/gestor/carteras/${carteraId}/visitas/pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarVisitaNoPago: (carteraId: number, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/gestor/carteras/${carteraId}/visitas/no-pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarGasto: async (
      carteraId: number,
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
      carteraId: number,
      input: RegistrarTrayectoriaRealInput,
    ) =>
      client.request<{ id: number; tipo: "real" }>(
        `/gestor/carteras/${carteraId}/trayectoria-real`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    tarjeta: (carteraId: number, clienteId: number) =>
      client.request<ClienteTarjetaPublic>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/tarjeta`,
      ),

    agregarEvidenciasCliente: async (
      carteraId: number,
      clienteId: number,
      evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
    ) => {
      const { body, boundary } = await construirMultipart({}, evidencias);
      return client.request<{ clienteId: number }>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/evidencias`,
        {
          method: "POST",
          body,
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        },
      );
    },

    listarClientesDeCartera: (carteraId: number) =>
      client.request<ClienteGestorPublic[]>(`/gestor/carteras/${carteraId}/clientes`),

    crearCliente: async (
      carteraId: number,
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

    listarNotas: (carteraId: number) =>
      client.request<CarteraNotaPublic[]>(`/gestor/carteras/${carteraId}/notas`),

    crearNota: (carteraId: number, nota: string) =>
      client.request<CarteraNotaPublic>(`/gestor/carteras/${carteraId}/notas`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody({ nota }),
      }),

    obtenerEstadoCuentaPrestamo: (carteraId: number, prestamoId: number) =>
      client.request<EstadoCuentaPrestamoPublic>(
        `/gestor/carteras/${carteraId}/prestamos/${prestamoId}/estado-cuenta`,
      ),

    listarPrestamosDeCliente: (carteraId: number, clienteId: number) =>
      client.request<PrestamoPublic[]>(
        `/gestor/carteras/${carteraId}/clientes/${clienteId}/prestamos`,
      ),

    detalleCuota: (carteraId: number, prestamoId: number, cuotaId: number) =>
      client.request<DetalleCuotaPublic>(
        `/gestor/carteras/${carteraId}/prestamos/${prestamoId}/cuotas/${cuotaId}/detalle`,
      ),

    crearPrestamo: (carteraId: number, input: RegistrarPrestamoInput) =>
      client.request<PrestamoPublic>(`/gestor/carteras/${carteraId}/prestamos`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    editarCuota: (
      carteraId: number,
      cuotaId: number,
      input: { valorEsperado?: number; password: string; motivo: string },
    ) =>
      client.request<CuotaPublic>(`/gestor/carteras/${carteraId}/cuotas/${cuotaId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarCuota: (
      carteraId: number,
      cuotaId: number,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: number }>(`/gestor/carteras/${carteraId}/cuotas/${cuotaId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarAbono: (
      carteraId: number,
      abonoId: number,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: number }>(`/gestor/carteras/${carteraId}/abonos/${abonoId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarPago: (
      carteraId: number,
      pagoId: number,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: number }>(`/gestor/carteras/${carteraId}/pagos/${pagoId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    generarLiquidacion: (carteraId: number, input: { comentario?: string | null }) =>
      client.request<LiquidacionPublic>(`/gestor/carteras/${carteraId}/liquidaciones`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    listarLiquidaciones: (carteraId: number) =>
      client.request<LiquidacionPublic[]>(`/gestor/carteras/${carteraId}/liquidaciones`),

    exportarLiquidacionPdf: (carteraId: number, liquidacionId: number) =>
      client.requestBytes(
        `/gestor/carteras/${carteraId}/liquidaciones/${liquidacionId}/export-pdf`,
      ),

    registrarApertura: (
      carteraId: number,
      input: { latitud?: number; longitud?: number },
    ) =>
      client.request<{ id: number; carteraId: number }>(
        `/gestor/carteras/${carteraId}/apertura`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    registrarPosicion: (
      carteraId: number,
      input: { latitud: number; longitud: number },
    ) =>
      client.request<{ carteraId: number; latitud: number; longitud: number }>(
        `/gestor/carteras/${carteraId}/posicion`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),
  };
}