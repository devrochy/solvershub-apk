import { horaValida, parsearHorario, partirRango, rangoValido, serializarHorario } from "./horario";

describe("horario de agendamiento", () => {
  it("parsea el JSON guardado y descarta lo que no es texto", () => {
    expect(parsearHorario('{"mon":"08:00-18:00","tue":"","wed":3}')).toEqual({
      mon: "08:00-18:00",
      tue: "",
    });
    expect(parsearHorario('no-json')).toEqual({});
    expect(parsearHorario(null)).toEqual({});
  });

  it("serializa solo los días con rango", () => {
    expect(serializarHorario({ mon: "08:00-18:00", tue: "", wed: " 09:00-17:00 " })).toBe(
      '{"mon":"08:00-18:00","wed":"09:00-17:00"}',
    );
  });

  it("valida horas y rangos", () => {
    expect(horaValida("08:00")).toBe(true);
    expect(horaValida("24:00")).toBe(false);
    expect(horaValida("8:00")).toBe(false);
    expect(partirRango("08:00-18:00")).toEqual({ inicio: "08:00", fin: "18:00" });
    expect(rangoValido("08:00-18:00")).toBe(true);
    expect(rangoValido("18:00-08:00")).toBe(false);
    expect(rangoValido("08:00")).toBe(false);
  });
});
