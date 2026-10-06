jest.mock("@react-native-async-storage/async-storage", () => {
  let almacen = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (k: string) => almacen.get(k) ?? null),
      setItem: jest.fn(async (k: string, v: string) => {
        almacen.set(k, v);
      }),
      removeItem: jest.fn(async (k: string) => {
        almacen.delete(k);
      }),
      clear: jest.fn(async () => {
        almacen.clear();
      }),
    },
  };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ClienteTarjetaPublic, TrayectoDiarioApkPublic, EstadisticasCarteraPublic, PrestamoPublic } from "@shared/types/gestor";
import {
  guardarCliente,
  guardarTrayectoDiario,
  guardarEstadisticasCartera,
  leerCliente,
  leerTrayectoDiario,
  leerEstadisticasCartera,
} from "./cache";

const trayectoDiario: TrayectoDiarioApkPublic = { clientes: [{ clienteId: "1", nombre: "Juan", enTrayecto: false, color: "verde", visitaRegistrada: false, diasMora: 0, compromisoValor: null }], trayectos: null };

const tarjeta: ClienteTarjetaPublic = { clienteId: "1", carteraId: "6", nombre: "Juan", negocio: null, telefonoWhatsapp: "+59170000000", color: "azul", fotoUrl: null, tipoDocumento: "ci", numeroDocumento: "1234567", tipoPago: null, saldoPendiente: 300, diasMora: 0 };

describe("cache offline", () => {
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  });

  it("guarda y lee el snapshot del día por cartera", async () => {
    await guardarTrayectoDiario("6", trayectoDiario);

    await expect(leerTrayectoDiario("6")).resolves.toEqual(trayectoDiario);
  });

  it("leerTrayectoDiario devuelve null si no hay cache para la cartera", async () => {
    await expect(leerTrayectoDiario("99")).resolves.toBeNull();
  });

  it("guarda y lee tarjeta + prestamos del cliente", async () => {
    const prestamos: PrestamoPublic[] = [{ id: "1", carteraId: "6", clienteId: "1", valor: 1000, numCuotas: 1, tipoInteres: 20, diasEntreCuotas: 7, fechaOtorgado: "2026-09-01", estatus: "vigente", cuotas: [{ id: "10", numeroCuota: 1, valorEsperado: 300, fechaVencimiento: "2026-09-01", estatus: "pendiente" }] }];
    await guardarCliente("6", "1", { tarjeta, prestamos });

    await expect(leerCliente("6", "1")).resolves.toEqual({ tarjeta, prestamos });
  });

  it("leerCliente devuelve null si no hay cache", async () => {
    await expect(leerCliente("6", "99")).resolves.toBeNull();
  });

  it("guarda y lee las estadísticas de la cartera", async () => {
    const estadisticas: EstadisticasCarteraPublic = {
      carteraId: "6",
      fecha: "2026-09-17",
      actual: {
        totalClientes: 5,
        clientesAtrasados: 2,
        clientesVencidos: 1,
        sinVisitaHoy: 3,
        sinVisitaDesdeUltimaLiquidada: 4,
        conPrestamosNuevos: 1,
        conMasDeUnPrestamo: 0,
        clientesNuevos: 0,
      },
      anterior: null,
      deltas: {
        totalClientes: null,
        clientesAtrasados: null,
        clientesVencidos: null,
        sinVisitaHoy: null,
        sinVisitaDesdeUltimaLiquidada: null,
        conPrestamosNuevos: null,
        conMasDeUnPrestamo: null,
        clientesNuevos: null,
      },
      actualizadoEn: "2026-09-17T23:55:00.000Z",
    };

    await guardarEstadisticasCartera("6", estadisticas);

    await expect(leerEstadisticasCartera("6")).resolves.toEqual(estadisticas);
  });

  it("leerEstadisticasCartera devuelve null si no hay cache", async () => {
    await expect(leerEstadisticasCartera("99")).resolves.toBeNull();
  });
});