import {
  COLORES_CANVAS,
  ETIQUETA_CANVAS,
  esPendienteOAtrasada,
  formatearFechaHora,
} from "./presentacion";

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
});
