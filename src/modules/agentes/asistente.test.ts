import {
  ESTACIONES,
  ESTADO_INICIAL,
  avisoDeTopeDeAgentes,
  cambiarTipo,
  cuerpoDeCreacion,
  elegirTipo,
  errorDeLaEstacion1,
  estadoRecomendado,
  etiquetaDeAgente,
  leerBorradorDeNuevoAgente,
  ocupadoDe,
  preguntasDelGuion,
  primerTipoLibre,
  puedeCrearAgentes,
  textoDeOcupado,
  textoDeRespuesta,
  valoresDeLaEstacion1,
  type AgenteDelNegocio,
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

function plantilla(key: string, extra: Partial<PlantillaAgente> = {}): PlantillaAgente {
  return {
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    description: "",
    available: true,
    missing_skills: [],
    will_enable: [],
    superpowers: [],
    requirements: [],
    questions: [pregunta("largo_respuesta")],
    ...extra,
  } as unknown as PlantillaAgente;
}

const agente = (a: Partial<AgenteDelNegocio>): AgenteDelNegocio => ({
  id: "x",
  key: "ventas",
  name: "Laura",
  status: "active",
  virtual: false,
  ...a,
});

describe("Nuevo agente en 5 estaciones (HU-APP-23)", () => {
  it("tiene las 5 estaciones fijas, con el guion dentro de «Tipo»", () => {
    expect(ESTACIONES.map((e) => e.titulo)).toEqual(["Tipo", "Habilidades", "Datos del cliente", "Datos para probar", "Revisar y publicar"]);
    const conReservada = plantilla("ventas", { questions: [pregunta("nombre"), pregunta("largo_respuesta")] });
    expect(preguntasDelGuion(conReservada).map((q) => q.id)).toEqual(["largo_respuesta"]);
  });

  it("elegir un tipo trae su guion recomendado y su nombre sugerido (Tomás en Agenda)", () => {
    expect(elegirTipo(plantilla("agenda"))).toEqual({ plantilla: "agenda", respuestas: { largo_respuesta: "a" }, nombre: "Tomás" });
    expect(elegirTipo(plantilla("ventas")).nombre).toBe("Laura");
  });

  it("el nombre sigue al tipo mientras el dueño no lo cambie", () => {
    const ventas = plantilla("ventas");
    const agenda = plantilla("agenda");
    expect(cambiarTipo(elegirTipo(ventas), ventas, agenda).nombre).toBe("Tomás");
    expect(cambiarTipo({ ...elegirTipo(ventas), nombre: "Pedro" }, ventas, agenda).nombre).toBe("Pedro");
  });

  it("un tipo ocupado por un agente activo o archivado no se elige; los virtuales y el propio no cuentan", () => {
    const agentes = [
      agente({ id: "a-1", key: "ventas", name: "Laura" }),
      agente({ id: "a-2", key: "agenda", name: "Tomás", status: "archived" }),
      agente({ id: null, key: "cobranza", name: "Virtual", virtual: true }),
    ];
    expect(ocupadoDe("ventas", agentes)).toEqual({ id: "a-1", nombre: "Laura", archivado: false });
    expect(ocupadoDe("agenda", agentes)).toEqual({ id: "a-2", nombre: "Tomás", archivado: true });
    expect(ocupadoDe("cobranza", agentes)).toBeNull();
    // El borrador de esta misma ruta no ocupa su propio tipo.
    expect(ocupadoDe("ventas", agentes, "a-1")).toBeNull();
    // Con uno activo y otro archivado, manda el activo.
    expect(ocupadoDe("ventas", [agente({ id: "v-0", status: "archived" }), agente({ id: "v-1" })])?.id).toBe("v-1");
    expect(textoDeOcupado("Ventas", false)).toBe("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.");
    expect(textoDeOcupado("Ventas", true)).toBe("Ya tienes un agente «Ventas», pero está archivado.");
  });

  it("lo recomendado es el primer tipo libre y disponible", () => {
    const plantillas = [plantilla("ventas"), plantilla("agenda"), plantilla("suscripciones", { available: false })];
    const agentes = [agente({ id: "a-1", key: "ventas" })];
    expect(primerTipoLibre(plantillas, agentes)?.key).toBe("agenda");
    expect(estadoRecomendado(plantillas, agentes)).toMatchObject({ plantilla: "agenda", nombre: "Tomás" });
    expect(estadoRecomendado([plantilla("ventas")], agentes)).toEqual(ESTADO_INICIAL);
  });

  it("compara el tipo, el nombre y el guion con lo recomendado", () => {
    expect(valoresDeLaEstacion1(elegirTipo(plantilla("agenda")))).toEqual({ tipo: "agenda", nombre: "Tomás", largo_respuesta: "a" });
  });

  it("valida la estación 1 antes de crear el borrador", () => {
    const ventas = plantilla("ventas");
    expect(errorDeLaEstacion1(ESTADO_INICIAL, null)).toBe("Elige qué quieres que haga tu agente.");
    expect(errorDeLaEstacion1(elegirTipo(ventas), plantilla("ventas", { available: false }))).toMatch(/no está disponible/);
    expect(errorDeLaEstacion1({ ...elegirTipo(ventas), nombre: " " }, ventas)).toBe("Ponle un nombre para seguir");
    expect(errorDeLaEstacion1({ ...elegirTipo(ventas), respuestas: {} }, ventas)).toBe("Elige una opción en «¿largo_respuesta?».");
    expect(errorDeLaEstacion1(elegirTipo(ventas), ventas)).toBeUndefined();
  });

  it("el cuerpo de from-script lleva solo respuestas del guion y el nombre", () => {
    const ventas = plantilla("ventas");
    expect(cuerpoDeCreacion({ plantilla: "ventas", respuestas: { largo_respuesta: "b", otra: "x" }, nombre: " Laura " }, ventas)).toEqual({
      template_key: "ventas",
      answers: { largo_respuesta: "b" },
      name: "Laura",
    });
  });

  it("retoma el borrador por su agent_id, con la estación entre 2 y 5", () => {
    expect(leerBorradorDeNuevoAgente(JSON.stringify({ agentId: "a-1", estacion: 3 }))).toEqual({ agentId: "a-1", estacion: 3 });
    expect(leerBorradorDeNuevoAgente(JSON.stringify({ agentId: "a-1", estacion: 9 }))).toEqual({ agentId: "a-1", estacion: 5 });
    expect(leerBorradorDeNuevoAgente(JSON.stringify({ agentId: "a-1" }))).toEqual({ agentId: "a-1", estacion: 2 });
    expect(leerBorradorDeNuevoAgente("")).toBeNull();
    expect(leerBorradorDeNuevoAgente("{roto")).toBeNull();
    expect(leerBorradorDeNuevoAgente(JSON.stringify({ estacion: 2 }))).toBeNull();
  });

  it("textos de respuesta, etiquetas y permiso", () => {
    const t = plantilla("ventas");
    expect(textoDeRespuesta(t.questions[0], { ...ESTADO_INICIAL, respuestas: { largo_respuesta: "b" } })).toBe("Opción B");
    expect(textoDeRespuesta(t.questions[0], ESTADO_INICIAL)).toBe("—");
    expect(etiquetaDeAgente({ key: "coordinador", kind: "core" })).toBe("Coordinador");
    expect(etiquetaDeAgente({ key: "ventas", kind: "specialist" })).toBe("Especialista");
    expect(puedeCrearAgentes({ role: "master" })).toBe(true);
    expect(puedeCrearAgentes({ role: "owner", permissions: { settings: "write" } })).toBe(true);
    expect(puedeCrearAgentes({ role: "owner", permissions: { settings: "read" } })).toBe(false);
  });

  it("avisa del tope de agentes solo cuando no queda cupo", () => {
    expect(avisoDeTopeDeAgentes({ used: 1, limit: 1, allowed: false })).toMatch(/ya tienes 1.*Mejora tu plan/);
    expect(avisoDeTopeDeAgentes({ used: 1, limit: 2, allowed: true })).toBeNull();
    expect(avisoDeTopeDeAgentes({ used: 99, limit: null, allowed: true })).toBeNull();
    expect(avisoDeTopeDeAgentes(null)).toBeNull();
  });
});
