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
import type { ClienteTarjetaPublic, DiaApkPublic, PrestamoPublic } from "../types/cobrador";
import {
  guardarCliente,
  guardarDia,
  leerCliente,
  leerDia,
} from "./cache";

const dia: DiaApkPublic = { clientes: [{ clienteId: 1, nombre: "Juan", enTrayecto: false, color: "verde" }], trayectos: null };

const tarjeta: ClienteTarjetaPublic = { clienteId: 1, rutaId: 6, nombre: "Juan", negocio: null, telefonoWhatsapp: "+59170000000", color: "azul", fotoUrl: null, tipoPago: null, saldoPendiente: 300, diasMora: 0 };

describe("cache offline", () => {
  beforeEach(async () => {
    await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
  });

  it("guarda y lee el snapshot del día por ruta", async () => {
    await guardarDia(6, dia);

    await expect(leerDia(6)).resolves.toEqual(dia);
  });

  it("leerDia devuelve null si no hay cache para la ruta", async () => {
    await expect(leerDia(99)).resolves.toBeNull();
  });

  it("guarda y lee tarjeta + prestamos del cliente", async () => {
    const prestamos: PrestamoPublic[] = [{ id: 1, rutaId: 6, clienteId: 1, valor: 1000, numCuotas: 1, tipoInteres: 20, diasEntreCuotas: 7, fechaOtorgado: "2026-09-01", estatus: "vigente", cuotas: [{ id: 10, numeroCuota: 1, valorEsperado: 300, fechaVencimiento: "2026-09-01", estatus: "pendiente" }] }];
    await guardarCliente(6, 1, { tarjeta, prestamos });

    await expect(leerCliente(6, 1)).resolves.toEqual({ tarjeta, prestamos });
  });

  it("leerCliente devuelve null si no hay cache", async () => {
    await expect(leerCliente(6, 99)).resolves.toBeNull();
  });
});