const { contenidoXml, resolverPins, PINS_POR_DEFECTO } = require("./index");

const FALSO = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe("solvershub-nsc (HU-APP-16)", () => {
  it("sin override usa los pins de CA por defecto (LE YE2 + ISRG Root X2)", () => {
    expect(resolverPins({})).toEqual(PINS_POR_DEFECTO);
    expect(PINS_POR_DEFECTO).toHaveLength(2);
  });

  it("el perfil de EAS puede reemplazar los pins (SOLVERSHUB_PINS, separados por coma)", () => {
    expect(resolverPins({ SOLVERSHUB_PINS: ` ${FALSO} ,${PINS_POR_DEFECTO[1]}` })).toEqual([
      FALSO,
      PINS_POR_DEFECTO[1],
    ]);
  });

  it("rechaza un pin que no es un SHA-256 en base64 (falla el build, no la app)", () => {
    expect(() => resolverPins({ SOLVERSHUB_PINS: "no-es-un-pin" })).toThrow(/SOLVERSHUB_PINS/);
    expect(() => resolverPins({ SOLVERSHUB_PINS: "AAAA=" })).toThrow(/SOLVERSHUB_PINS/);
  });

  it("el XML lleva cada pin y bloquea el tráfico claro salvo en desarrollo", () => {
    const xml = contenidoXml(false, [FALSO]);
    expect(xml).toContain(`<pin digest="SHA-256">${FALSO}</pin>`);
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false">');
    expect(xml).toContain('<domain includeSubdomains="true">solvershub.site</domain>');
    expect(contenidoXml(true, [FALSO])).toContain('<base-config cleartextTrafficPermitted="true">');
  });
});
