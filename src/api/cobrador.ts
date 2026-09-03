import type {
  ClienteCobradorPublic,
  ClienteTarjetaPublic,
  CrearClienteInput,
  CuotaPublic,
  DetalleCuotaPublic,
  DiaApkPublic,
  EstadoCuentaPrestamoPublic,
  GastoPublic,
  PrestamoPublic,
  RegistrarGastoInput,
  RegistrarPrestamoInput,
  RegistrarTrayectoriaRealInput,
  RegistrarVisitaInput,
  RutaApkPublic,
  RutaNotaPublic,
  VisitaPublic,
} from "../types/cobrador";
import type { ApiClient } from "./client";

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonBody(input: unknown): string {
  return JSON.stringify(input);
}

export interface CobradorApi {
  misRutas(): Promise<RutaApkPublic[]>;
  dia(rutaId: number): Promise<DiaApkPublic>;
  generarTrayecto(rutaId: number): Promise<unknown>;
  registrarVisitaPago(
    rutaId: number,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarVisitaNoPago(
    rutaId: number,
    input: RegistrarVisitaInput,
  ): Promise<VisitaPublic>;
  registrarGasto(
    rutaId: number,
    input: RegistrarGastoInput,
    evidencias: { uri: string; name: string; type: string }[],
  ): Promise<GastoPublic>;
  registrarTrayectoriaReal(
    rutaId: number,
    input: RegistrarTrayectoriaRealInput,
  ): Promise<{ id: number; tipo: "real" }>;
  tarjeta(rutaId: number, clienteId: number): Promise<ClienteTarjetaPublic>;
  agregarEvidenciasCliente(
    rutaId: number,
    clienteId: number,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<{ clienteId: number }>;
  listarClientesDeRuta(rutaId: number): Promise<ClienteCobradorPublic[]>;
  crearCliente(
    rutaId: number,
    input: CrearClienteInput,
    evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
  ): Promise<ClienteCobradorPublic>;
  listarNotas(rutaId: number): Promise<RutaNotaPublic[]>;
  crearNota(rutaId: number, nota: string): Promise<RutaNotaPublic>;
  obtenerEstadoCuentaPrestamo(
    rutaId: number,
    prestamoId: number,
  ): Promise<EstadoCuentaPrestamoPublic>;
  detalleCuota(
    rutaId: number,
    prestamoId: number,
    cuotaId: number,
  ): Promise<DetalleCuotaPublic>;
  listarPrestamosDeCliente(
    rutaId: number,
    clienteId: number,
  ): Promise<PrestamoPublic[]>;
  crearPrestamo(
    rutaId: number,
    input: RegistrarPrestamoInput,
  ): Promise<PrestamoPublic>;
  editarCuota(
    rutaId: number,
    cuotaId: number,
    input: { valorEsperado?: number; password: string; motivo: string },
  ): Promise<CuotaPublic>;
  eliminarCuota(
    rutaId: number,
    cuotaId: number,
    input: { password: string; motivo: string },
  ): Promise<{ id: number }>;
  eliminarAbono(
    rutaId: number,
    abonoId: number,
    input: { password: string; motivo: string },
  ): Promise<{ id: number }>;
  registrarApertura(
    rutaId: number,
    input: { latitud?: number; longitud?: number },
  ): Promise<{ id: number; rutaId: number }>;
  registrarPosicion(
    rutaId: number,
    input: { latitud: number; longitud: number },
  ): Promise<{ rutaId: number; latitud: number; longitud: number }>;
}

export function cobradorApi(client: ApiClient): CobradorApi {
  return {
    misRutas: () => client.request<RutaApkPublic[]>("/cobrador/mis-rutas"),

    dia: (rutaId: number) =>
      client.request<DiaApkPublic>(`/cobrador/rutas/${rutaId}/dia`),

    generarTrayecto: (rutaId: number) =>
      client.request<unknown>(`/cobrador/rutas/${rutaId}/trayecto`, {
        method: "POST",
      }),

    registrarVisitaPago: (rutaId: number, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/cobrador/rutas/${rutaId}/visitas/pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarVisitaNoPago: (rutaId: number, input: RegistrarVisitaInput) =>
      client.request<VisitaPublic>(`/cobrador/rutas/${rutaId}/visitas/no-pago`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarGasto: (
      rutaId: number,
      input: RegistrarGastoInput,
      evidencias: { uri: string; name: string; type: string }[],
    ) => {
      const form = new FormData();
      form.append("descripcion", input.descripcion);
      form.append("valor", String(input.valor));
      for (const archivo of evidencias) {
        form.append("evidencias", {
          uri: archivo.uri,
          name: archivo.name,
          type: archivo.type,
        } as unknown as Blob);
      }
      return client.request<GastoPublic>(`/cobrador/rutas/${rutaId}/gastos`, {
        method: "POST",
        body: form,
      });
    },

    registrarTrayectoriaReal: (
      rutaId: number,
      input: RegistrarTrayectoriaRealInput,
    ) =>
      client.request<{ id: number; tipo: "real" }>(
        `/cobrador/rutas/${rutaId}/trayectoria-real`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    tarjeta: (rutaId: number, clienteId: number) =>
      client.request<ClienteTarjetaPublic>(
        `/cobrador/rutas/${rutaId}/clientes/${clienteId}/tarjeta`,
      ),

    agregarEvidenciasCliente: (
      rutaId: number,
      clienteId: number,
      evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
    ) => {
      const form = new FormData();
      for (const e of evidencias) {
        form.append(e.campo, {
          uri: e.uri,
          name: e.name,
          type: e.type,
        } as unknown as Blob);
      }
      return client.request<{ clienteId: number }>(
        `/cobrador/rutas/${rutaId}/clientes/${clienteId}/evidencias`,
        { method: "POST", body: form },
      );
    },

    listarClientesDeRuta: (rutaId: number) =>
      client.request<ClienteCobradorPublic[]>(`/cobrador/rutas/${rutaId}/clientes`),

    crearCliente: (
      rutaId: number,
      input: CrearClienteInput,
      evidencias: { campo: "foto_facial" | "documento_frente" | "documento_reverso"; uri: string; name: string; type: string }[],
    ) => {
      const form = new FormData();
      form.append("nombre", input.nombre);
      form.append("apellido", input.apellido);
      if (input.negocio) {
        form.append("negocio", input.negocio);
      }
      form.append("telefonoWhatsapp", input.telefonoWhatsapp);
      form.append("latitud", String(input.latitud));
      form.append("longitud", String(input.longitud));
      if (input.topeMaximoDeuda !== undefined) {
        form.append("topeMaximoDeuda", String(input.topeMaximoDeuda));
      }
      for (const archivo of evidencias) {
        form.append(archivo.campo, {
          uri: archivo.uri,
          name: archivo.name,
          type: archivo.type,
        } as unknown as Blob);
      }
      return client.request<ClienteCobradorPublic>(
        `/cobrador/rutas/${rutaId}/clientes`,
        { method: "POST", body: form },
      );
    },

    listarNotas: (rutaId: number) =>
      client.request<RutaNotaPublic[]>(`/cobrador/rutas/${rutaId}/notas`),

    crearNota: (rutaId: number, nota: string) =>
      client.request<RutaNotaPublic>(`/cobrador/rutas/${rutaId}/notas`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody({ nota }),
      }),

    obtenerEstadoCuentaPrestamo: (rutaId: number, prestamoId: number) =>
      client.request<EstadoCuentaPrestamoPublic>(
        `/cobrador/rutas/${rutaId}/prestamos/${prestamoId}/estado-cuenta`,
      ),

    listarPrestamosDeCliente: (rutaId: number, clienteId: number) =>
      client.request<PrestamoPublic[]>(
        `/cobrador/rutas/${rutaId}/clientes/${clienteId}/prestamos`,
      ),

    detalleCuota: (rutaId: number, prestamoId: number, cuotaId: number) =>
      client.request<DetalleCuotaPublic>(
        `/cobrador/rutas/${rutaId}/prestamos/${prestamoId}/cuotas/${cuotaId}/detalle`,
      ),

    crearPrestamo: (rutaId: number, input: RegistrarPrestamoInput) =>
      client.request<PrestamoPublic>(`/cobrador/rutas/${rutaId}/prestamos`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    editarCuota: (
      rutaId: number,
      cuotaId: number,
      input: { valorEsperado?: number; password: string; motivo: string },
    ) =>
      client.request<CuotaPublic>(`/cobrador/rutas/${rutaId}/cuotas/${cuotaId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarCuota: (
      rutaId: number,
      cuotaId: number,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: number }>(`/cobrador/rutas/${rutaId}/cuotas/${cuotaId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    eliminarAbono: (
      rutaId: number,
      abonoId: number,
      input: { password: string; motivo: string },
    ) =>
      client.request<{ id: number }>(`/cobrador/rutas/${rutaId}/abonos/${abonoId}`, {
        method: "DELETE",
        headers: JSON_HEADERS,
        body: jsonBody(input),
      }),

    registrarApertura: (
      rutaId: number,
      input: { latitud?: number; longitud?: number },
    ) =>
      client.request<{ id: number; rutaId: number }>(
        `/cobrador/rutas/${rutaId}/apertura`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),

    registrarPosicion: (
      rutaId: number,
      input: { latitud: number; longitud: number },
    ) =>
      client.request<{ rutaId: number; latitud: number; longitud: number }>(
        `/cobrador/rutas/${rutaId}/posicion`,
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: jsonBody(input),
        },
      ),
  };
}