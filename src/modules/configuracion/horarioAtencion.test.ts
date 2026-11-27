import { aRangosTexto, DIAS_FRANJA, erroresDeFranjas, leyendaDias, textoARangos } from "./horarioAtencion";

describe("horario de atención: índice de días como el backend (ADR-0051)", () => {
  it("0 es lunes y 6 es domingo, como weekday() de Python", () => {
    expect(DIAS_FRANJA[0]).toBe("Lun");
    expect(DIAS_FRANJA[6]).toBe("Dom");
    expect(leyendaDias()).toBe("0 Lun · 1 Mar · 2 Mié · 3 Jue · 4 Vie · 5 Sáb · 6 Dom");
  });

  it("«lunes 08:00-18:00» va al backend como day 0 y vuelve igual", () => {
    const lunes = DIAS_FRANJA.indexOf("Lun");
    const rangos = textoARangos(`${lunes} 08:00-18:00`);
    expect(rangos).toEqual([{ day: 0, from: "08:00", to: "18:00" }]);
    expect(aRangosTexto(rangos)).toBe("0 08:00-18:00");
  });

  it("ignora líneas inválidas y días fuera de 0-6", () => {
    expect(textoARangos("7 08:00-18:00\nlunes 8-18\n 6 9:00 - 12:00 ")).toEqual([
      { day: 6, from: "9:00", to: "12:00" },
    ]);
  });

  it("acepta una semana válida y el vacío (siempre abierto)", () => {
    expect(erroresDeFranjas([])).toEqual([]);
    expect(
      erroresDeFranjas([
        { day: 0, from: "08:00", to: "18:00" },
        { day: 5, from: "08:00", to: "13:00" },
      ]),
    ).toEqual([]);
  });

  it("marca el cierre antes de la apertura con el nombre del día", () => {
    expect(erroresDeFranjas([{ day: 2, from: "18:00", to: "08:00" }])).toEqual([
      { day: 2, message: "El cierre del miércoles debe ser después de la apertura." },
    ]);
  });

  it("marca las franjas que se cruzan dentro del mismo día", () => {
    expect(
      erroresDeFranjas([
        { day: 1, from: "08:00", to: "12:00" },
        { day: 1, from: "11:00", to: "18:00" },
      ]),
    ).toEqual([
      { day: 1, message: "Las franjas del martes se cruzan. Ajusta la hora de cierre o la de apertura." },
    ]);
  });
});
