import type {
  ClienteCobradorPublic,
  ClienteTarjetaPublic,
  CuotaPublic,
  DiaApkPublic,
  EstadoCuentaPrestamoPublic,
  GastoPublic,
  PrestamoPublic,
  RegistrarGastoInput,
  RegistrarPrestamoInput,
  RegistrarTrayectoriaRealInput,
  RegistrarVisitaInput,
  RutaApkPublic,
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
    evidencias: { campo: "foto_facial" | "documento_frente"; uri: string; name: string; type: string }[],
  ): Promise<{ clienteId: number }>;
  listarClientesDeRuta(rutaId: number): Promise<ClienteCobradorPublic[]>;
  obtenerEstadoCuentaPrestamo(
    rutaId: number,
    prestamoId: number,
  ): Promise<EstadoCuentaPrestamoPublic>;
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
      evidencias: { campo: "foto_facial" | "documento_frente"; uri: string; name: string; type: string }[],
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

    obtenerEstadoCuentaPrestamo: (rutaId: number, prestamoId: number) =>
      client.request<EstadoCuentaPrestamoPublic>(
        `/cobrador/rutas/${rutaId}/prestamos/${prestamoId}/estado-cuenta`,
      ),

    listarPrestamosDeCliente: (rutaId: number, clienteId: number) =>
      client.request<PrestamoPublic[]>(
        `/cobrador/rutas/${rutaId}/clientes/${clienteId}/prestamos`,
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
  };
}