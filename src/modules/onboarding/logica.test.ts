import {
  ESTADO_INICIAL,
  PASOS,
  TOTAL_PASOS,
  accionDelAviso,
  cambiosDelPaso1,
  conLoRecomendado,
  conTipo,
  errorDelPaso,
  errorDelPaso1,
  estadoDesdeIdentidad,
  fraseDelTipo,
  ideasDeLaBienvenida,
  pasoDeCinco,
  pasosQueFaltan,
  textoDeAvance,
  textoDelAviso,
  tituloDelPaso,
  valoresDelPaso1,
  type Recorrido,
} from "./logica";
import { cambiosFrenteARecomendado } from "@shared/ruta-de-lanzamiento";

const base: Recorrido = { estado: "en_curso", paso: 1, total_pasos: 5, aplica: true, abrir: false, avisar: true };

describe("bienvenida en 5 estaciones (HU-APP-23)", () => {
  it("tiene las 5 estaciones de la ruta", () => {
    expect(TOTAL_PASOS).toBe(5);
    expect(PASOS.map((p) => p.corto)).toEqual(["Tu negocio", "Habilidades", "Datos del cliente", "Datos para probar", "Revisar y publicar"]);
    expect(textoDeAvance(2)).toBe("Paso 2 de 5");
  });

  it("traduce un paso guardado con otra escala, como el servidor", () => {
    expect(pasoDeCinco({ paso: 3, total_pasos: 5 })).toBe(3);
    expect(pasoDeCinco({ paso: 9, total_pasos: 5 })).toBe(5);
    expect(pasoDeCinco({ paso: 3, total_pasos: 4 })).toBe(4);
    expect(pasoDeCinco({ paso: 7, total_pasos: 9 })).toBe(4);
    expect(pasoDeCinco({ paso: 0, total_pasos: 5 })).toBe(1);
  });

  it("llega con lo recomendado: Vendo productos, Laura y la frase del tipo", () => {
    expect(ESTADO_INICIAL).toMatchObject({ tipo: "ventas", nombreDelAgente: "Laura", descripcion: fraseDelTipo("ventas") });
    expect(ideasDeLaBienvenida("agenda")).toEqual(["Laura", "Tomás", "Luna"]);
    // Sin nombres de función como idea.
    expect(ideasDeLaBienvenida("cobranza")).toEqual(["Laura", "Clara", "Nico"]);
  });

  it("la frase sigue al tipo solo si el dueño no la editó", () => {
    const cambiado = conTipo(ESTADO_INICIAL, "agenda");
    expect(cambiado.descripcion).toBe(fraseDelTipo("agenda"));
    const propia = conTipo({ ...ESTADO_INICIAL, descripcion: "Pan artesanal" }, "agenda");
    expect(propia.descripcion).toBe("Pan artesanal");
  });

  it("cambiar el tipo cuenta un cambio, no dos, frente a lo recomendado", () => {
    const recomendado = conLoRecomendado(ESTADO_INICIAL);
    expect(cambiosFrenteARecomendado(valoresDelPaso1(conTipo(ESTADO_INICIAL, "agenda")), valoresDelPaso1(recomendado))).toEqual(["tipo"]);
    const otroNombre = { ...ESTADO_INICIAL, nombreDelAgente: "Sofía" };
    expect(cambiosFrenteARecomendado(valoresDelPaso1(otroNombre), valoresDelPaso1(recomendado))).toEqual(["nombre"]);
  });

  it("la estación 1 pide tipo, negocio, frase y nombre", () => {
    const listo = { ...ESTADO_INICIAL, negocio: "La Espiga" };
    expect(errorDelPaso1(listo)).toBeUndefined();
    expect(errorDelPaso1(ESTADO_INICIAL)).toBe("Escribe cómo se llama tu negocio.");
    expect(errorDelPaso("negocio", { ...listo, tipo: null })).toBe("Elige a qué se dedica tu negocio.");
    expect(errorDelPaso("negocio", { ...listo, descripcion: "corta" })).toBe("Cuéntanos en una frase a qué se dedica tu negocio.");
    expect(errorDelPaso("identidad", { ...listo, nombreDelAgente: " " })).toBe("Ponle un nombre a tu agente.");
  });

  it("guarda en la identidad «negocio. frase» y el nombre del agente", () => {
    expect(cambiosDelPaso1({ ...ESTADO_INICIAL, negocio: "La Espiga", descripcion: "Pan artesanal" })).toEqual({
      business_description: "La Espiga. Pan artesanal",
      assistant_name: "Laura",
    });
  });

  it("al retomar muestra la frase sola y no toma el nombre del alta como elección", () => {
    const desde = estadoDesdeIdentidad(
      { assistant_name: "La Espiga", business_description: "La Espiga. Pan artesanal" },
      { ...ESTADO_INICIAL, negocio: "La Espiga" },
    );
    expect(desde.descripcion).toBe("Pan artesanal");
    expect(desde.nombreDelAgente).toBe("Laura");
    expect(estadoDesdeIdentidad({ assistant_name: "Sofía", business_description: "" }).nombreDelAgente).toBe("Sofía");
  });

  it("los títulos llevan el nombre y «Datos para probar» va por tipo", () => {
    expect(tituloDelPaso("habilidades", "Laura", "ventas")).toBe("¿Qué sabe hacer Laura?");
    expect(tituloDelPaso("datos-probar", "Laura", "ventas")).toBe("Dale a Laura algo que vender");
    expect(tituloDelPaso("datos-probar", "Tomás", "agenda")).toBe("¿Qué citas agenda Tomás?");
  });

  it("el aviso cuenta las estaciones que faltan de 5", () => {
    expect(pasosQueFaltan({ ...base, paso: 1 })).toBe(5);
    expect(textoDelAviso({ ...base, paso: 3 })).toBe("Tu agente aún no está listo para responder. Faltan 3 de 5 pasos.");
    expect(textoDelAviso({ ...base, paso: 5 })).toBe("Tu agente aún no está listo para responder. Falta 1 de 5 pasos.");
    expect(pasosQueFaltan({ ...base, estado: "completo" })).toBe(0);
    expect(accionDelAviso({ ...base, estado: "pendiente", paso: 1 })).toBe("Empezar");
    expect(accionDelAviso({ ...base, paso: 2 })).toBe("Continuar");
  });
});
