import {
  agendasVisibles,
  aliasesDeTexto,
  codigoPorDefecto,
  inicialDeAgenda,
  normalizarCodigo,
  serieDeColor,
  serieDeEvento,
  tituloDeEvento,
  type EventoAgenda,
} from "./agenda";

function cita(parcial: Partial<EventoAgenda> = {}): EventoAgenda {
  return {
    id: "appt-1",
    title: "Demo",
    start: "2026-10-27T15:00:00Z",
    end: "2026-10-27T16:00:00Z",
    kind: "appointment",
    status: "scheduled",
    source: "local",
    color: "#198754",
    can_cancel: true,
    attendee_email: "",
    notes: "",
    appointment_type_id: "t-1",
    tipo_color: "cat-2",
    tipo_codigo: "DEM",
    calendar_id: "c-1",
    calendar_color: "cat-3",
    ...parcial,
  };
}

describe("agenda (HU-CAL-08)", () => {
  it("traduce colores categóricos a serie", () => {
    expect(serieDeColor("cat-1")).toBe(1);
    expect(serieDeColor("cat-4")).toBe(4);
    expect(serieDeColor("rojo")).toBeNull();
  });

  it("colorea por tipo o por agenda según lo visible", () => {
    expect(serieDeEvento(cita(), "tipo")).toBe(2);
    expect(serieDeEvento(cita(), "agenda")).toBe(3);
    expect(serieDeEvento(cita({ kind: "block" }), "agenda")).toBeNull();
  });

  it("antepone el código del tipo al título de la cita, no al bloqueo", () => {
    expect(tituloDeEvento(cita())).toBe("DEM · Demo");
    expect(tituloDeEvento(cita({ kind: "block", title: "Almuerzo" }))).toBe("Almuerzo");
  });

  it("calcula el código por defecto y lo normaliza", () => {
    expect(codigoPorDefecto("Asesoría 30")).toBe("ASE");
    expect(normalizarCodigo("  demo  ")).toBe("DEMO");
    expect(normalizarCodigo("12345678")).toBe("123456");
  });

  it("usa la inicial del nombre sin acentos", () => {
    expect(inicialDeAgenda("  Ángela Ruiz")).toBe("A");
    expect(inicialDeAgenda("Sede Norte")).toBe("S");
  });

  it("conserva las agendas guardadas que existen y muestra las nuevas", () => {
    expect(agendasVisibles(["a", "b"], ["a", "b", "c"])).toEqual(["a", "b"]);
    expect(agendasVisibles(["x"], ["a", "b"])).toEqual(["a", "b"]);
    expect(agendasVisibles(null, ["a", "b"])).toEqual(["a", "b"]);
  });

  it("convierte alias separados por coma sin repetir", () => {
    expect(aliasesDeTexto(" doctora, sede norte ,, doctora ")).toEqual(["doctora", "sede norte"]);
  });
});
