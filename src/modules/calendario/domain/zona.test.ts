import {
  aUtcDesdeZona,
  claveDia,
  diasDeSemana,
  duracionMinutos,
  hoyEnZona,
  horaDe,
  inicioDeSemana,
  isoDePared,
  mesYAnio,
  minutosAHora,
  minutosDelDia,
  partesEnZona,
  sumarDias,
} from "./zona";

describe("zona horaria de la agenda", () => {
  it("lee un instante UTC en la zona del negocio", () => {
    const p = partesEnZona("2026-10-27T14:30:00Z", "America/Bogota");
    expect(p).toMatchObject({ anio: 2026, mes: 10, dia: 27, hora: 9, minuto: 30, clave: "2026-10-27" });
    expect(horaDe("2026-10-27T14:30:00Z", "America/Bogota")).toBe("09:30");
    expect(minutosDelDia("2026-10-27T14:30:00Z", "America/Bogota")).toBe(570);
  });

  it("convierte hora de pared del negocio a UTC (Bogotá, UTC-5)", () => {
    expect(aUtcDesdeZona(2026, 10, 27, 9, 0, "America/Bogota")).toBe("2026-10-27T14:00:00.000Z");
  });

  it("convierte la hora de pared del selector a UTC", () => {
    const fecha = new Date(2026, 9, 27, 9, 0, 0, 0);
    expect(isoDePared(fecha, "America/Bogota")).toBe("2026-10-27T14:00:00.000Z");
  });

  it("calcula la semana que empieza el lunes", () => {
    expect(inicioDeSemana("2026-10-27")).toBe("2026-10-26");
    expect(inicioDeSemana("2026-10-26")).toBe("2026-10-26");
    expect(sumarDias("2026-10-27", 7)).toBe("2026-11-03");
    expect(diasDeSemana("2026-10-26").map((d) => d.clave)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("formatea el encabezado y la fecha de hoy", () => {
    expect(mesYAnio("2026-10-27")).toBe("Octubre de 2026");
    expect(hoyEnZona("America/Bogota", new Date("2026-10-28T03:00:00Z"))).toBe("2026-10-27");
    expect(claveDia("2026-10-28T03:00:00Z", "America/Bogota")).toBe("2026-10-27");
  });

  it("formatea minutos y duraciones", () => {
    expect(minutosAHora(570)).toBe("09:30");
    expect(minutosAHora(1500)).toBe("01:00");
    expect(duracionMinutos("2026-10-27T14:00:00Z", "2026-10-27T15:30:00Z")).toBe(90);
  });
});
