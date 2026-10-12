import {
  COLORES_CANVAS,
  ETIQUETA_CANVAS,
  detalleDesdeEstadoCuenta,
  esPendienteOAtrasada,
  fechaCortaCuota,
  formatearFechaHora,
} from "./presentacion";
import type { EstadoCuentaPrestamoPublic } from "@shared/types/gestor";

const ESTADO: EstadoCuentaPrestamoPublic = {
  prestamoId: "p1",
  carteraId: "c1",
  clienteId: "k1",
  nombreCliente: "Juana Perez",
  valor: 1000,
  numCuotas: 2,
  tipoInteres: 10,
  estatus: "vigente",
  moneda: "COP",
  cuotas: [
    { cuotaId: "q1", numeroCuota: 1, valorEsperado: 550, fechaVencimiento: "2026-10-13", estatus: "pendiente", abonosAcumulados: 100, saldoPendiente: 450 },
    { cuotaId: "q2", numeroCuota: 2, valorEsperado: 550, fechaVencimiento: "2026-10-14", estatus: "pendiente", abonosAcumulados: 0, saldoPendiente: 550 },
  ],
  totalAbonos: 100,
  saldoPendiente: 1000,
  proximoVencimiento: "2026-10-13",
};

describe("presentacion de cliente (HU-APP-07)", () => {
  it("etiqueta y color existen para cada tipo del canvas", () => {
    const tipos = ["pagada", "actual", "en_mora", "futura", "abonada"] as const;
    for (const tipo of tipos) {
      expect(ETIQUETA_CANVAS[tipo]).toBeTruthy();
      expect(COLORES_CANVAS[tipo].fondo).toBeTruthy();
      expect(COLORES_CANVAS[tipo].borde).toBeTruthy();
    }
  });

  it("solo pendiente y atrasada son accionables", () => {
    expect(esPendienteOAtrasada("pendiente")).toBe(true);
    expect(esPendienteOAtrasada("atrasada")).toBe(true);
    expect(esPendienteOAtrasada("pagada")).toBe(false);
    expect(esPendienteOAtrasada("futura")).toBe(false);
  });

  it("formatea fecha-hora en local y tolera valores inválidos", () => {
    const fija = new Date(2026, 9, 6, 14, 30);
    const texto = formatearFechaHora(fija.toISOString());
    expect(texto).toMatch(/^2026-10-06 \d{2}:30$/);
    expect(formatearFechaHora("no-es-fecha")).toBe("no-es-fecha");
  });

  it("sin señal arma el detalle de la cuota desde el estado de cuenta", () => {
    expect(detalleDesdeEstadoCuenta(ESTADO, "q1")).toEqual({
      cuotaId: "q1",
      numeroCuota: 1,
      valorEsperado: 550,
      fechaVencimiento: "2026-10-13",
      estatus: "pendiente",
      abonosAcumulados: 100,
      saldoPendiente: 450,
      pagos: [],
      abonos: [],
      ultimaVisita: null,
    });
    expect(detalleDesdeEstadoCuenta(ESTADO, "otra")).toBeNull();
    expect(detalleDesdeEstadoCuenta(null, "q1")).toBeNull();
  });

  it("la fecha de la casilla del canvas va corta", () => {
    expect(fechaCortaCuota("2026-10-13")).toBe("13/10");
    expect(fechaCortaCuota("2026-10-13T00:00:00Z")).toBe("13/10");
    expect(fechaCortaCuota("mañana")).toBe("mañana");
  });
});
