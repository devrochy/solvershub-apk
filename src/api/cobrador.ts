import type {
  ClienteTarjetaPublic,
  DiaApkPublic,
  GastoPublic,
  PrestamoPublic,
  RegistrarGastoInput,
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
  listarPrestamosDeCliente(
    rutaId: number,
    clienteId: number,
  ): Promise<PrestamoPublic[]>;
}

export function cobradorApi(client: ApiClient): CobradorApi {
  return {
    misRutas: () => client.request<RutaApkPublic[]>("/cobrador/mis-rutas"),

    dia: (rutaId: number) =>
      client.request<DiaApkPublic>(`/cobrador/rutas/${rutaId}/dia`),

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

    listarPrestamosDeCliente: (rutaId: number, clienteId: number) =>
      client.request<PrestamoPublic[]>(
        `/cobrador/rutas/${rutaId}/clientes/${clienteId}/prestamos`,
      ),
  };
}