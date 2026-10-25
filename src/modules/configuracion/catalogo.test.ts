import catalogo from "./testing/catalogo.json";
import {
  aEstado,
  ayudaDeOpcion,
  deEstado,
  dependencia,
  errorDeRango,
  erroresDeRango,
  estadoInicial,
  etiquetaDeValor,
  opcionesDelGrupo,
  valoresConActual,
  valoresDeEstado,
  type CatalogoConfig,
} from "./catalogo";

const cat = catalogo as unknown as CatalogoConfig;
const opcion = (clave: string) => {
  const o = cat.opciones.find((x) => x.clave === clave);
  if (!o) throw new Error(`falta ${clave}`);
  return o;
};

describe("catálogo de configuración (SPEC-37)", () => {
  it("muestra la etiqueta con su nota, nunca el identificador crudo", () => {
    const natural = opcion("debounce_mode").valores!.find((v) => v.valor === "natural")!;
    expect(etiquetaDeValor(natural)).toMatch(/^Natural · espera 15 s/);
  });

  it("conserva a la vista un valor guardado que ya no está en la lista", () => {
    const con = valoresConActual(opcion("debounce_mode"), "rarisimo");
    expect(con[con.length - 1]).toMatchObject({ valor: "rarisimo", nota: "valor actual" });
    expect(valoresConActual(opcion("debounce_mode"), "natural")).toHaveLength(opcion("debounce_mode").valores!.length);
  });

  it("arma la ayuda con qué cambia, ejemplo y rango, sin duplicar el punto", () => {
    const ayuda = ayudaDeOpcion(opcion("difficulty_score_threshold"));
    expect(ayuda).toMatch(/Entre 1 y 10 puntos\.$/);
    expect(ayudaDeOpcion(opcion("brand_voice"))).not.toMatch(/\.\./);
  });

  it("rechaza lo que está fuera del rango", () => {
    expect(errorDeRango(opcion("difficulty_score_threshold"), 11)).toBe(
      "«Puntaje para razonamiento» debe estar entre 1 y 10.",
    );
    expect(errorDeRango(opcion("difficulty_score_threshold"), 5)).toBeNull();
    expect(errorDeRango(opcion("difficulty_score_threshold"), Number.NaN)).not.toBeNull();
  });

  it("apaga «Mensaje fuera de horario» sin franjas y da el motivo", () => {
    const dep = dependencia(opcion("out_of_hours_message"), { business_ranges: [] });
    expect(dep.activa).toBe(false);
    expect(dep.motivo).toMatch(/Sin horario/);
    expect(dep.de).toBe("business_ranges");
    expect(dependencia(opcion("out_of_hours_message"), { business_ranges: [{ day: 0 }] }).activa).toBe(true);
  });

  it("pinta solo lo que la pantalla puede mostrar: sin bajas ni zona del horario", () => {
    const identidad = { palabras_de_baja: [], business_tz: "UTC", assistant_name: "Ana" };
    expect(opcionesDelGrupo(cat, "bajas", identidad)).toEqual([]);
    expect(opcionesDelGrupo(cat, "horario", identidad)).toEqual([]);
    expect(opcionesDelGrupo(cat, "identidad", identidad).map((o) => o.clave)).toEqual(["assistant_name"]);
  });

  it("convierte borradores y valores de la API sin perder nada", () => {
    expect(aEstado(opcion("persona_forbidden"), ["a", "b"])).toBe("a, b");
    expect(deEstado(opcion("persona_forbidden"), "a, b , ")).toEqual(["a", "b"]);
    expect(aEstado(opcion("business_ranges"), [{ day: 0, from: "08:00", to: "18:00" }])).toBe("0 08:00-18:00");
    expect(deEstado(opcion("business_ranges"), "0 08:00-18:00")).toEqual([{ day: 0, from: "08:00", to: "18:00" }]);
    expect(deEstado(opcion("persona_warmth"), "3")).toBe(3);
    expect(deEstado(opcion("persona_warmth"), "")).toBeNaN();
    expect(aEstado(opcion("bot_paused"), true)).toBe(true);
  });

  it("junta los errores de rango por campo", () => {
    const estado = estadoInicial(cat, { persona_warmth: 9, difficulty_score_threshold: 3 });
    expect(erroresDeRango(cat, estado)).toEqual({ persona_warmth: "«Calidez» debe estar entre 0 y 5." });
    expect(valoresDeEstado(cat, estado)).toMatchObject({ persona_warmth: 9 });
  });
});
