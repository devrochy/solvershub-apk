import { clasificarCuotas, CuotaCanvas } from "./canvas-cuotas";

function cuota(overrides: Partial<CuotaCanvas>): CuotaCanvas {
  return {
    cuotaId: 1,
    numeroCuota: 1,
    valorEsperado: 100,
    fechaVencimiento: "2026-09-10",
    estatus: "pendiente",
    abonosAcumulados: 0,
    saldoPendiente: 100,
    ...overrides,
  };
}

describe("clasificarCuotas", () => {
  it("marca la primera cuota no pagada con saldo como actual y las siguientes como futura", () => {
    const cuotas = [
      cuota({ numeroCuota: 1, estatus: "pagada", saldoPendiente: 0 }),
      cuota({ numeroCuota: 2, estatus: "pendiente", saldoPendiente: 100 }),
      cuota({ numeroCuota: 3, estatus: "pendiente", saldoPendiente: 100 }),
    ];
    const resultado = clasificarCuotas(cuotas);
    expect(resultado.map((c) => c.tipo)).toEqual([
      "pagada",
      "actual",
      "futura",
    ]);
  });

  it("marca como actual la primera atrasada con saldo y como en_mora las atrasadas posteriores", () => {
    const cuotas = [
      cuota({ numeroCuota: 1, estatus: "atrasada", saldoPendiente: 100 }),
      cuota({ numeroCuota: 2, estatus: "atrasada", saldoPendiente: 100 }),
      cuota({ numeroCuota: 3, estatus: "pendiente", saldoPendiente: 100 }),
    ];
    const resultado = clasificarCuotas(cuotas);
    expect(resultado.map((c) => c.tipo)).toEqual([
      "actual",
      "en_mora",
      "futura",
    ]);
  });

  it("marca como futura la cuota pendiente con saldo posterior a la actual", () => {
    const cuotas = [
      cuota({ numeroCuota: 1, estatus: "pendiente", saldoPendiente: 40 }),
      cuota({ numeroCuota: 2, estatus: "pendiente", saldoPendiente: 100 }),
    ];
    const resultado = clasificarCuotas(cuotas);
    expect(resultado[0].tipo).toBe("actual");
    expect(resultado[1].tipo).toBe("futura");
  });

  it("marca como abonada una cuota pendiente totalmente abonada", () => {
    const cuotas = [
      cuota({ numeroCuota: 1, estatus: "pendiente", saldoPendiente: 0 }),
      cuota({ numeroCuota: 2, estatus: "pendiente", saldoPendiente: 100 }),
    ];
    const resultado = clasificarCuotas(cuotas);
    expect(resultado[0].tipo).toBe("abonada");
    expect(resultado[1].tipo).toBe("actual");
  });

  it("mantiene abonosAcumulados y saldoPendiente por cuota", () => {
    const cuotas = [
      cuota({
        numeroCuota: 1,
        estatus: "pendiente",
        abonosAcumulados: 40,
        saldoPendiente: 60,
      }),
    ];
    const resultado = clasificarCuotas(cuotas);
    expect(resultado[0].abonosAcumulados).toBe(40);
    expect(resultado[0].saldoPendiente).toBe(60);
    expect(resultado[0].tipo).toBe("actual");
  });

  it("devuelve array vacío si no hay cuotas", () => {
    expect(clasificarCuotas([])).toEqual([]);
  });
});