import {
  ESTACIONES_DE_LA_BIENVENIDA,
  ESTACIONES_DE_NUEVO_AGENTE,
  cambiosFrenteARecomendado,
  errorDelNombre,
  ideasDeNombre,
  inicialDe,
  nombreSugeridoDelTipo,
  numeroDeEstacion,
  siglasDe,
  textoDeCambios,
  textoDeGuardarYSeguir,
  textoDeLaRuta,
  tipoDeLaPlantilla,
} from "./ruta-de-lanzamiento";

describe("ruta de lanzamiento (HU-APP-23)", () => {
  it("las dos rutas tienen 5 estaciones y comparten de la 2 a la 5", () => {
    expect(ESTACIONES_DE_LA_BIENVENIDA.map((e) => e.titulo)).toEqual([
      "Tu negocio",
      "Habilidades",
      "Datos del cliente",
      "Datos para probar",
      "Revisar y publicar",
    ]);
    expect(ESTACIONES_DE_NUEVO_AGENTE[0].titulo).toBe("Tipo");
    expect(ESTACIONES_DE_NUEVO_AGENTE.slice(1)).toEqual(ESTACIONES_DE_LA_BIENVENIDA.slice(1));
    expect(numeroDeEstacion("negocio")).toBe(1);
    expect(numeroDeEstacion("tipo")).toBe(1);
    expect(numeroDeEstacion("datos-probar")).toBe(4);
    expect(textoDeLaRuta("habilidades")).toBe("Paso 2 de 5 · Habilidades");
  });

  it("el botón dice a qué estación sigue", () => {
    expect(textoDeGuardarYSeguir("habilidades")).toBe("Guardar y seguir: Datos del cliente");
    expect(textoDeGuardarYSeguir("datos-probar")).toBe("Guardar y seguir: Revisar y publicar");
    expect(textoDeGuardarYSeguir("revisar")).toBe("Guardar y seguir");
  });

  it("cuenta los cambios frente a lo recomendado; las listas son conjuntos y lo que falta no cuenta", () => {
    expect(cambiosFrenteARecomendado({ a: 1, b: "x" }, { a: 1, b: "y" })).toEqual(["b"]);
    expect(cambiosFrenteARecomendado({ l: ["b", "a"] }, { l: ["a", "b"] })).toEqual([]);
    expect(cambiosFrenteARecomendado({ l: ["a"] }, { l: ["a", "b"] })).toEqual(["l"]);
    expect(cambiosFrenteARecomendado({}, { a: 1 })).toEqual([]);
    expect(textoDeCambios(1)).toBe("1 cambio");
    expect(textoDeCambios(3)).toBe("3 cambios");
  });

  it("sugiere nombres de persona: Tomás en Agenda, sin nombres de función", () => {
    expect(nombreSugeridoDelTipo("agenda")).toBe("Tomás");
    expect(nombreSugeridoDelTipo("ventas")).toBe("Laura");
    expect(ideasDeNombre("Tomás", "agenda")).toEqual(["Tomás", "Sofía", "Mateo"]);
    expect(ideasDeNombre("Laura", null, 4, ["Clara", "Cobros", "Nico"])).toEqual(["Laura", "Clara", "Nico"]);
  });

  it("valida el nombre y arma iniciales", () => {
    expect(errorDelNombre("  ")).toBe("Ponle un nombre para seguir");
    expect(errorDelNombre("x".repeat(61))).toBe("Usa máximo 60 caracteres.");
    expect(errorDelNombre("Laura")).toBeNull();
    expect(inicialDe(" tomás")).toBe("T");
    expect(siglasDe("Tomás")).toBe("TO");
    expect(tipoDeLaPlantilla("agenda")).toBe("agenda");
    expect(tipoDeLaPlantilla("otra")).toBeNull();
  });
});
