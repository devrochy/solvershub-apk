import {
  ESTADO_INICIAL,
  accionDelAviso,
  agregarFrase,
  cambiosDelPaso,
  errorDelPaso,
  estadoDesdeIdentidad,
  franjasDeHorario,
  horarioDeFranjas,
  motivosDePalabras,
  muestraDeVoz,
  palabrasDeEscalar,
  pasosQueFaltan,
  resumenDeHorario,
  respuestasDeCreacion,
  textoDelAviso,
  type EstadoDelAsistente,
  type IdentitySettings,
  type Recorrido,
} from "./logica";

const RECORRIDO: Recorrido = { estado: "omitido", paso: 3, total_pasos: 6, aplica: true, abrir: false, avisar: true };
const listo: EstadoDelAsistente = {
  ...ESTADO_INICIAL,
  tipo: "ventas",
  descripcion: "Vendemos ropa deportiva en Manizales",
  nombreDelAgente: "Sofía",
};

describe("lógica del asistente de primer uso (HU-APP-22)", () => {
  it("exige tipo, una frase del negocio y un nombre antes de salir del primer paso", () => {
    expect(errorDelPaso("negocio", ESTADO_INICIAL)).toMatch(/Elige a qué se dedica/);
    expect(errorDelPaso("negocio", { ...listo, descripcion: "corta" })).toMatch(/en una frase/);
    expect(errorDelPaso("negocio", { ...listo, nombreDelAgente: "  " })).toMatch(/nombre/);
    expect(errorDelPaso("negocio", listo)).toBeUndefined();
  });

  it("pide al menos un día si hay horario elegido", () => {
    expect(errorDelPaso("reglas", { ...listo, horario: { dias: [], bloque: "jornada" } })).toMatch(/al menos un día/);
    expect(errorDelPaso("reglas", listo)).toBeUndefined();
  });

  it("traduce el horario elegido a franjas y las lee de vuelta", () => {
    const franjas = franjasDeHorario({ dias: [4, 0, 0, 1], bloque: "jornada" });
    expect(franjas).toEqual([
      { day: 0, from: "08:00", to: "18:00" },
      { day: 1, from: "08:00", to: "18:00" },
      { day: 4, from: "08:00", to: "18:00" },
    ]);
    expect(horarioDeFranjas(franjas)).toEqual({ dias: [0, 1, 4], bloque: "jornada" });
    expect(horarioDeFranjas([{ day: 0, from: "09:15", to: "17:00" }])).toBeNull();
  });

  it("resume el horario en palabras", () => {
    expect(resumenDeHorario({ dias: [0, 1, 2, 3, 4], bloque: "jornada" })).toBe("Lunes a viernes, 8:00 a 18:00");
    expect(resumenDeHorario({ dias: [0, 1, 2, 3, 4, 5, 6], bloque: "todo" })).toBe("Todos los días, las 24 horas");
    expect(resumenDeHorario({ dias: [], bloque: "jornada" })).toBe("");
  });

  it("guarda el horario siempre como informativo: el agente responde 24/7", () => {
    const cambios = cambiosDelPaso("reglas", listo);
    expect(cambios.business_hours_mode).toBe("informativo");
    expect(cambios.business_ranges).toHaveLength(5);
  });

  it("convierte los motivos en palabras y de vuelta", () => {
    const palabras = palabrasDeEscalar(["persona", "reclamo"]);
    expect(palabras).toContain("asesor");
    expect(motivosDePalabras(palabras)).toEqual(["persona", "reclamo"]);
  });

  it("normaliza frases prohibidas sin repetir ni pasar del máximo", () => {
    expect(agregarFrase(["gratis"], "  GRATIS ")).toEqual(["gratis"]);
    expect(agregarFrase([], "  sin   falta ")).toEqual(["sin falta"]);
    expect(agregarFrase(Array.from({ length: 12 }, (_, i) => `f${i}`), "otra")).toHaveLength(12);
  });

  it("la voz de ejemplo cambia con el tono, los emojis y el largo", () => {
    const base = { tono: "cercano", calidez: 4, emojis: "none", largo: "normal" } as const;
    expect(muestraDeVoz(base, "Sofía", "Moda Sur")).toContain("Soy Sofía, de Moda Sur");
    expect(muestraDeVoz({ ...base, tono: "formal" }, "Sofía", "")).toContain("Le atiende Sofía");
    expect(muestraDeVoz({ ...base, emojis: "free" }, "Sofía", "")).toContain("😊");
    expect(muestraDeVoz({ ...base, largo: "cortas" }, "Sofía", "")).not.toContain("Soy Sofía");
  });

  it("arma las respuestas de creación y los cambios de identidad", () => {
    expect(respuestasDeCreacion({ ...listo, queVende: "ambos", largo: "cortas" })).toEqual({ largo_respuesta: "cortas", que_vendes: "ambos" });
    expect(respuestasDeCreacion({ ...listo, tipo: "agenda" })).toEqual({ largo_respuesta: "normal" });
    expect(cambiosDelPaso("voz", { ...listo, largo: "detalladas", calidez: 9 })).toMatchObject({ persona_max_length: 900, persona_warmth: 5 });
  });

  it("retoma lo ya guardado en Identidad", () => {
    const identidad = {
      assistant_name: "Vera",
      business_description: "Vendemos café",
      persona_tone: "formal",
      persona_warmth: 2,
      persona_emojis: "none",
      persona_max_length: 300,
      persona_forbidden: ["gratis"],
      escalation_keywords: ["asesor", "humano", "persona", "hablar con alguien"],
      business_ranges: [{ day: 0, from: "08:00", to: "12:00" }],
    } as unknown as IdentitySettings;
    expect(estadoDesdeIdentidad(identidad)).toMatchObject({
      nombreDelAgente: "Vera",
      tono: "formal",
      calidez: 2,
      emojis: "none",
      largo: "cortas",
      prohibidas: ["gratis"],
      motivos: ["persona"],
      horario: { dias: [0], bloque: "manana" },
    });
  });

  it("dice cuántos pasos faltan y qué botón ofrecer", () => {
    expect(pasosQueFaltan(RECORRIDO)).toBe(4);
    expect(textoDelAviso(RECORRIDO)).toBe("Tu agente aún no está listo para probar. Faltan 4 pasos.");
    expect(textoDelAviso({ ...RECORRIDO, paso: 6 })).toBe("Tu agente aún no está listo para probar. Falta 1 paso.");
    expect(pasosQueFaltan({ ...RECORRIDO, estado: "completo" })).toBe(0);
    expect(accionDelAviso(RECORRIDO)).toBe("Continuar");
    expect(accionDelAviso({ ...RECORRIDO, estado: "pendiente", paso: 1 })).toBe("Empezar");
  });
});
