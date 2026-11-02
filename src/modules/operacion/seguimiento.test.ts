import {
  cuerpoDeSeguimiento,
  fechaDePared,
  ordenPorDefectoDeSeguimiento,
  paredDeFecha,
  seguimientoDeFila,
  sugerenciaDeSeguimiento,
  textoDeHoraDelNegocio,
  textoDeSeguimiento,
  tieneLeadDeVenta,
} from "./seguimiento";

describe("seguimiento del lead (HU-CRM-21)", () => {
  it("lee el seguimiento de la fila y descarta lo que no es válido", () => {
    expect(
      seguimientoDeFila({
        extras: { seguimiento_en: "2026-11-03T14:00:00+00:00", seguimiento_nota: "Llamar", seguimiento_estado: "hoy" },
      }),
    ).toEqual({ en: "2026-11-03T14:00:00+00:00", nota: "Llamar", estado: "hoy" });
    expect(seguimientoDeFila({ extras: { seguimiento_en: null } })).toBeNull();
    expect(seguimientoDeFila({ extras: {} })).toBeNull();
    expect(seguimientoDeFila({})).toBeNull();
    expect(
      seguimientoDeFila({ extras: { seguimiento_en: "2026-11-03T14:00:00Z", seguimiento_nota: "  ", seguimiento_estado: "raro" } }),
    ).toEqual({ en: "2026-11-03T14:00:00Z", nota: null, estado: null });
  });

  it("muestra la fecha en la zona del negocio, no en la del teléfono", () => {
    // 14:00 UTC = 9:00 en Bogotá, 3:00 p. m. en Madrid.
    expect(textoDeSeguimiento("2026-11-03T14:00:00Z", "America/Bogota")).toMatch(/9:00/);
    expect(textoDeSeguimiento("2026-11-03T14:00:00Z", "Europe/Madrid")).toMatch(/3:00/);
    expect(textoDeSeguimiento("no es fecha")).toBe("—");
    expect(textoDeSeguimiento("2026-11-03T14:00:00Z", "Zona/Inexistente")).toMatch(/9:00/);
  });

  it("convierte la hora de pared sin cambiar de zona", () => {
    const fecha = fechaDePared("2026-11-03T09:05");
    expect(fecha).not.toBeNull();
    expect([fecha?.getFullYear(), fecha?.getMonth(), fecha?.getDate(), fecha?.getHours(), fecha?.getMinutes()]).toEqual([
      2026, 10, 3, 9, 5,
    ]);
    expect(paredDeFecha(fecha as Date)).toBe("2026-11-03T09:05");
    expect(fechaDePared("")).toBeNull();
    expect(fechaDePared("2026-11-03")).toBeNull();
    expect(textoDeHoraDelNegocio("")).toBe("—");
    expect(textoDeHoraDelNegocio("2026-11-03T09:05")).toMatch(/9:05/);
  });

  it("sugiere mañana a las 9:00", () => {
    const sugerida = sugerenciaDeSeguimiento(new Date(2026, 10, 2, 17, 30));
    expect(paredDeFecha(sugerida)).toBe("2026-11-03T09:00");
  });

  it("arma el cuerpo: con fecha manda nota y fecha; quitar manda la fecha vacía", () => {
    expect(cuerpoDeSeguimiento("  Llamar  ", new Date(2026, 10, 3, 9, 0))).toEqual({
      seguimiento_nota: "Llamar",
      seguimiento_en: "2026-11-03T09:00",
    });
    expect(cuerpoDeSeguimiento("x".repeat(300), new Date(2026, 10, 3, 9, 0)).seguimiento_nota).toHaveLength(200);
    expect(cuerpoDeSeguimiento("Llamar", null)).toEqual({ seguimiento_en: "" });
  });

  it("ordena por seguimiento cuando hay un filtro de seguimiento, salvo «sin seguimiento»", () => {
    expect(ordenPorDefectoDeSeguimiento(["seguimiento:vencidos"])).toBe("seguimiento");
    expect(ordenPorDefectoDeSeguimiento(["estado_lead:nuevo", "seguimiento:hoy"])).toBe("seguimiento");
    expect(ordenPorDefectoDeSeguimiento(["seguimiento:sin_seguimiento"])).toBeUndefined();
    expect(ordenPorDefectoDeSeguimiento(["estado_lead:nuevo"])).toBeUndefined();
    expect(ordenPorDefectoDeSeguimiento(undefined)).toBeUndefined();
  });

  it("sabe si el cliente tiene lead de venta por su etapa", () => {
    expect(tieneLeadDeVenta({ extras: { estado_lead: "Nuevo" } })).toBe(true);
    expect(tieneLeadDeVenta({ extras: { estado_lead: "" } })).toBe(false);
    expect(tieneLeadDeVenta({})).toBe(false);
  });
});
