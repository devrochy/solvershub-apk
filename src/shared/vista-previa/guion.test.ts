import {
  respuestaDePrueba,
  rotuloDePruebas,
  saludoDePrueba,
  sugerenciasPorEstacion,
  type MensajeDeVistaPrevia,
} from "./guion";

const contexto = { agente: "Laura", negocio: "La Espiga" };
const cargados = [
  { tipo: "producto", nombre: "Torta de zanahoria", detalle: "$ 45.000" },
  { tipo: "producto", nombre: "Pan de bono", detalle: "$ 3.000" },
  { tipo: "tipo", nombre: "Corte", detalle: "30 min" },
];
const textos = (m: MensajeDeVistaPrevia[]) =>
  m.map((x) => (x.tipo === "tarjeta" ? `${x.texto} ${x.filas.map((f) => `${f.nombre} ${f.detalle ?? ""}`).join(" ")}` : x.texto)).join(" ");

describe("chat simulado de la ruta (HU-APP-23)", () => {
  it("ofrece mensajes de prueba por estación y tipo", () => {
    expect(sugerenciasPorEstacion("ventas", "negocio").map((s) => s.texto)).toEqual(["¿Quién eres?", "¿Qué venden?", "¿Dónde están?"]);
    expect(sugerenciasPorEstacion("agenda", "habilidades").map((s) => s.id)).toEqual(["agendar", "cambiar", "pagos"]);
    expect(rotuloDePruebas("datos-cliente")).toBe("Pruebas de «Datos del cliente» · toca una");
    expect(saludoDePrueba("ventas", "Laura", "La Espiga").texto).toBe("Hola, soy Laura, de La Espiga. ¿Qué se te antoja hoy?");
  });

  it("en las estaciones 1 a 3 no usa lo cargado ni dice cifras", () => {
    for (const estacion of ["negocio", "habilidades", "datos-cliente"] as const) {
      for (const s of sugerenciasPorEstacion("ventas", estacion, cargados)) {
        expect(textos(respuestaDePrueba("ventas", estacion, s.id, { ...contexto, cargados }))).not.toMatch(/\d/);
      }
    }
    expect(sugerenciasPorEstacion("ventas", "habilidades", cargados).some((s) => s.id.startsWith("precio:"))).toBe(false);
  });

  it("desde la 4 muestra lo cargado del tipo, con el detalle tal cual", () => {
    const sugerencias = sugerenciasPorEstacion("ventas", "datos-probar", cargados);
    expect(sugerencias.map((s) => s.texto)).toContain("¿Cuánto vale Torta de zanahoria?");
    const precio = respuestaDePrueba("ventas", "datos-probar", "precio:Torta de zanahoria", { ...contexto, cargados });
    expect(textos(precio)).toContain("$ 45.000");
    // De Agenda solo cuentan los `tipo` de cita.
    const catalogo = respuestaDePrueba("agenda", "datos-probar", "catalogo", { ...contexto, cargados });
    expect(textos(catalogo)).toContain("Corte");
    expect(textos(catalogo)).not.toContain("Torta");
  });

  it("sin nada cargado invita a cargar, sin inventar", () => {
    expect(textos(respuestaDePrueba("ventas", "datos-probar", "catalogo", contexto))).toBe(
      "Cuando cargues tus productos, aquí los muestro con el precio que les pongas.",
    );
    expect(textos(respuestaDePrueba("cobranza", "negocio", "quien", contexto))).toMatch(/^Soy Laura, de La Espiga/);
  });
});
