import type { EventoAgenda } from "./agenda";
import { moverRango, rangoDelDia, redimensionarRango, snapMinutos, vistaDelDia } from "./layout";

const ZONA = "America/Bogota";

function evento(id: string, inicio: string, fin: string, kind: EventoAgenda["kind"] = "appointment"): EventoAgenda {
  return {
    id,
    title: id,
    start: inicio,
    end: fin,
    kind,
    status: "scheduled",
    source: "local",
    color: "",
    can_cancel: true,
    attendee_email: "",
    notes: "",
    appointment_type_id: "",
  };
}

describe("línea del día (HU-CAL-08)", () => {
  it("usa 06:00–22:00 y se amplía a los eventos que se salen", () => {
    expect(rangoDelDia([], ZONA)).toEqual({ inicio: 360, fin: 1320 });
    expect(rangoDelDia([evento("a", "2026-10-27T10:00:00Z", "2026-10-27T11:00:00Z")], ZONA)).toEqual({
      inicio: 300,
      fin: 1320,
    });
    expect(rangoDelDia([evento("a", "2026-10-28T04:00:00Z", "2026-10-28T05:00:00Z")], ZONA)).toEqual({
      inicio: 360,
      fin: 1440,
    });
  });

  it("posiciona una cita por hora local", () => {
    const vista = vistaDelDia(
      [evento("a", "2026-10-27T14:00:00Z", "2026-10-27T15:00:00Z")],
      ZONA,
      { inicio: 360, fin: 1320 },
      60,
    );
    expect(vista.citas[0]).toMatchObject({ top: 180, height: 58, izquierda: 0, ancho: 1 });
  });

  it("reparte en columnas dos citas solapadas", () => {
    const vista = vistaDelDia(
      [
        evento("a", "2026-10-27T14:00:00Z", "2026-10-27T15:00:00Z"),
        evento("b", "2026-10-27T14:30:00Z", "2026-10-27T15:30:00Z"),
      ],
      ZONA,
      { inicio: 360, fin: 1320 },
      60,
    );
    expect(vista.citas).toHaveLength(2);
    expect(vista.citas.map((c) => [c.izquierda, c.ancho])).toEqual([
      [0, 0.5],
      [0.5, 0.5],
    ]);
  });

  it("deja los bloqueos a todo el ancho y separados de las citas", () => {
    const vista = vistaDelDia(
      [
        evento("a", "2026-10-27T14:00:00Z", "2026-10-27T15:00:00Z"),
        evento("b", "2026-10-27T14:00:00Z", "2026-10-27T16:00:00Z", "block"),
      ],
      ZONA,
      { inicio: 360, fin: 1320 },
      60,
    );
    expect(vista.citas).toHaveLength(1);
    expect(vista.bloques[0]).toMatchObject({ izquierda: 0, ancho: 1 });
  });

  it("mueve conservando la duración y sin salir del rango", () => {
    expect(moverRango(600, 660, 17, { inicio: 360, fin: 1320 })).toEqual({ inicio: 615, fin: 675 });
    expect(moverRango(600, 660, -1000, { inicio: 360, fin: 1320 })).toEqual({ inicio: 360, fin: 420 });
    expect(moverRango(1200, 1260, 1000, { inicio: 360, fin: 1320 })).toEqual({ inicio: 1260, fin: 1320 });
  });

  it("redimensiona con un mínimo de 15 minutos", () => {
    expect(redimensionarRango(600, 660, 20, { inicio: 360, fin: 1320 })).toEqual({ inicio: 600, fin: 675 });
    expect(redimensionarRango(600, 660, -1000, { inicio: 360, fin: 1320 })).toEqual({ inicio: 600, fin: 615 });
  });

  it("hace snap a 15 minutos", () => {
    expect(snapMinutos(607)).toBe(600);
    expect(snapMinutos(608)).toBe(615);
  });
});
