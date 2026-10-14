import { COLORES } from "./theme";
import { shColor, shTheme } from "./tokens";

describe("tema del APK derivado de los tokens de marca", () => {
  it("los roles de ambos temas quedan definidos (sin vacíos)", () => {
    for (const tema of ["claro", "oscuro"] as const) {
      const colores = COLORES[tema];
      expect(Object.keys(colores).sort()).toEqual(
        [
          "acento",
          "activoSuave",
          "borde",
          "exito",
          "fondo",
          "peligro",
          "primario",
          "sobrePrimario",
          "sobrePrimarioSuave",
          "tarjeta",
          "texto",
          "textoSuave",
        ].sort(),
      );
      for (const [rol, valor] of Object.entries(colores)) {
        expect(`${tema}.${rol}=${valor}`).toMatch(/=#[0-9A-Fa-f]{6}$|^oscuro\.borde=rgba\(/);
      }
    }
  });

  it("mapea a los tokens semánticos (no hay hex sueltos)", () => {
    expect(COLORES.claro.fondo).toBe(shTheme.light.bg);
    expect(COLORES.claro.tarjeta).toBe(shTheme.light.surface);
    expect(COLORES.claro.texto).toBe(shTheme.light.text);
    expect(COLORES.claro.acento).toBe(shTheme.light.link);
    expect(COLORES.oscuro.fondo).toBe(shTheme.dark.bg);
    expect(COLORES.oscuro.tarjeta).toBe(shTheme.dark.surface);
    expect(COLORES.oscuro.acento).toBe(shTheme.dark.link);
    expect(COLORES.oscuro.acento).toBe(shColor.cyan["400"]);
    expect(COLORES.claro.peligro).toBe(shColor.danger);
    expect(COLORES.claro.primario).toBe(shColor.navy["700"]);
  });
});
