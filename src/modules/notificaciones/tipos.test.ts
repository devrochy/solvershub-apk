import {
  CATEGORIAS,
  CATEGORIA,
  SEVERIDADES,
  SEVERIDAD,
  agruparPorDia,
  categoriaDe,
  etiquetaDeDia,
  minutosHastaManana,
  severidadDe,
  tiempoRelativo,
  type NotificacionItem,
} from "./tipos";

const AHORA = new Date(2026, 9, 25, 15, 0, 0);
const hace = (min: number) => new Date(AHORA.getTime() - min * 60_000).toISOString();

describe("clasificación de notificaciones (ADR-0167)", () => {
  it("cada categoría y severidad tiene ícono y etiqueta", () => {
    for (const c of CATEGORIAS) {
      expect(CATEGORIA[c].label).toBeTruthy();
      expect(CATEGORIA[c].icon).toBeTruthy();
    }
    for (const s of SEVERIDADES) {
      expect(SEVERIDAD[s].label).toBeTruthy();
      expect(SEVERIDAD[s].icon).toBeTruthy();
      expect(SEVERIDAD[s].tono).toBeTruthy();
    }
  });

  it("un valor desconocido del backend cae a un valor seguro", () => {
    expect(categoriaDe("otra")).toBe("sistema");
    expect(categoriaDe("ventas")).toBe("ventas");
    expect(severidadDe("otra")).toBe("info");
    expect(severidadDe("critical")).toBe("critical");
  });

  it("tiempo relativo en español", () => {
    expect(tiempoRelativo(hace(0), AHORA)).toBe("ahora");
    expect(tiempoRelativo(hace(5), AHORA)).toBe("hace 5 min");
    expect(tiempoRelativo(hace(180), AHORA)).toBe("hace 3 h");
    expect(tiempoRelativo(hace(60 * 24 * 1 + 30), AHORA)).toBe("ayer");
    expect(tiempoRelativo(hace(60 * 24 * 3), AHORA)).toBe("hace 3 días");
  });

  it("agrupa por día conservando el orden", () => {
    const mk = (id: string, iso: string) => ({ id, created_at: iso }) as unknown as NotificacionItem;
    const grupos = agruparPorDia([mk("1", hace(10)), mk("2", hace(20)), mk("3", hace(60 * 24 + 5))], AHORA);
    expect(grupos.map((g) => [g.dia, g.items.length])).toEqual([
      ["Hoy", 2],
      ["Ayer", 1],
    ]);
    expect(etiquetaDeDia(hace(1), AHORA)).toBe("Hoy");
  });

  it("«hasta mañana» llega a las 8:00 del día siguiente", () => {
    expect(minutosHastaManana(AHORA)).toBe(17 * 60);
  });
});
