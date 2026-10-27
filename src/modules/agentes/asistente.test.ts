import {
  MAX_PASOS,
  cuerpoDeCreacion,
  elegirTipo,
  errorDelPaso,
  etiquetaDeAgente,
  pasoDelCampo,
  pasosDelAsistente,
  puedeCrearAgentes,
  textoDeRespuesta,
  ESTADO_INICIAL,
  type PlantillaAgente,
} from "./asistente";

const pregunta = (id: string, def = "a") => ({
  id,
  text: `¿${id}?`,
  help: "",
  type: "option" as const,
  default: def,
  options: [
    { id: "a", text: "Opción A", help: "" },
    { id: "b", text: "Opción B", help: "" },
  ],
});

function plantilla(n: number, extra: Partial<PlantillaAgente> = {}): PlantillaAgente {
  return {
    key: "ventas",
    name: "Ventas",
    description: "",
    available: true,
    missing_skills: [],
    will_enable: [],
    superpowers: [],
    requirements: [],
    questions: Array.from({ length: n }, (_, i) => pregunta(`q${i}`)),
    ...extra,
  } as unknown as PlantillaAgente;
}

describe("asistente de creación de agentes (HU-AOS-56)", () => {
  it("sin tipo solo hay un paso; con tipo suma preguntas y cierres", () => {
    expect(pasosDelAsistente(null).map((p) => p.id)).toEqual(["tipo"]);
    const ids = pasosDelAsistente(plantilla(2)).map((p) => p.id);
    expect(ids).toEqual(["tipo", "q0", "q1", "nombre", "contenido", "revisar", "publicar"]);
  });

  it("nunca pasa de diez pasos aunque el guion traiga más preguntas", () => {
    expect(pasosDelAsistente(plantilla(30))).toHaveLength(MAX_PASOS);
  });

  it("una pregunta con id reservado no pisa un paso del asistente", () => {
    const t = plantilla(0, { questions: [pregunta("nombre"), pregunta("q1")] } as never);
    const ids = pasosDelAsistente(t).map((p) => p.id);
    expect(ids.filter((i) => i === "nombre")).toHaveLength(1);
  });

  it("elegir tipo deja las respuestas por defecto y valida cada paso", () => {
    const t = plantilla(1, { questions: [pregunta("q0", "b")] } as never);
    const estado = elegirTipo(t);
    expect(estado.respuestas).toEqual({ q0: "b" });
    const [tipo, p0, nombre] = pasosDelAsistente(t);
    expect(errorDelPaso(tipo, ESTADO_INICIAL, null)).toMatch(/Elige/);
    expect(errorDelPaso(tipo, estado, { ...t, available: false })).toMatch(/no está disponible/);
    expect(errorDelPaso(p0, { ...estado, respuestas: {} }, t)).toMatch(/opciones/);
    expect(errorDelPaso(p0, estado, t)).toBeUndefined();
    expect(errorDelPaso(nombre, { ...estado, nombre: "x".repeat(121) }, t)).toMatch(/120/);
  });

  it("el cuerpo solo lleva respuestas del guion y el nombre si lo hay", () => {
    const t = plantilla(1);
    const estado = { plantilla: "ventas", respuestas: { q0: "a", ajena: "z" }, nombre: "  Luna  " };
    expect(cuerpoDeCreacion(estado, t)).toEqual({ template_key: "ventas", answers: { q0: "a" }, name: "Luna" });
    expect(cuerpoDeCreacion({ ...estado, nombre: " " }, t)).not.toHaveProperty("name");
  });

  it("un error de campo de la API lleva al paso de esa pregunta, o a «Revisar»", () => {
    const pasos = pasosDelAsistente(plantilla(2));
    expect(pasoDelCampo("q1", pasos)).toBe(2);
    expect(pasoDelCampo("name", pasos)).toBe(3);
    expect(pasoDelCampo("desconocido", pasos)).toBe(pasos.findIndex((p) => p.id === "revisar"));
  });

  it("textos de respuesta, etiquetas y permiso", () => {
    const t = plantilla(1);
    expect(textoDeRespuesta(t.questions[0], { ...ESTADO_INICIAL, respuestas: { q0: "b" } })).toBe("Opción B");
    expect(textoDeRespuesta(t.questions[0], ESTADO_INICIAL)).toBe("—");
    expect(etiquetaDeAgente({ key: "coordinador", kind: "core" })).toBe("Coordinador");
    expect(etiquetaDeAgente({ key: "general", kind: "specialist" })).toBe("General");
    expect(etiquetaDeAgente({ key: "ventas", kind: "specialist" })).toBe("Especialista");
    expect(puedeCrearAgentes({ role: "master" }, "legacy")).toBe(true);
    expect(puedeCrearAgentes({ role: "owner", permissions: { settings: "write" } }, "v3")).toBe(true);
    expect(puedeCrearAgentes({ role: "owner", permissions: { settings: "write" } }, "legacy")).toBe(false);
    expect(puedeCrearAgentes({ role: "owner", permissions: { settings: "read" } }, "v3")).toBe(false);
  });
});
