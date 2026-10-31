import { CATALOGO_SPEC_29, ENDPOINT_SPEC_29 } from "./widgets.catalogo.fixture";
import { ORDEN_POR_PERFIL, WIDGETS, widgetPorClave, widgetsDelPerfil } from "./widgets";
import type { PerfilResumen } from "./perfil";

describe("paridad con el catálogo de widgets de SPEC-29", () => {
  it("el registro tiene exactamente las claves de la spec", () => {
    expect(WIDGETS.map((w) => w.clave).sort()).toEqual(CATALOGO_SPEC_29.map((f) => f.clave).sort());
  });

  it.each(CATALOGO_SPEC_29)("$clave: mismo permiso que la spec", ({ clave, permiso }) => {
    expect(widgetPorClave(clave)?.permiso ?? null).toBe(permiso);
  });

  it.each(Object.entries(ENDPOINT_SPEC_29))("%s: el endpoint es el de la spec", (clave, patron) => {
    expect(widgetPorClave(clave)?.endpoint).toMatch(patron);
  });

  it("todo widget pendiente dice por qué y qué HU lo destraba; los demás tienen fuente", () => {
    for (const w of WIDGETS) {
      if (w.pendiente) {
        expect(w.pendiente.length).toBeGreaterThan(10);
        expect(w.fuente).toBe("ninguna");
      } else {
        expect(w.fuente).not.toBe("ninguna");
      }
    }
  });

  it("el orden de cada perfil solo nombra widgets del catálogo y que son de ese perfil", () => {
    for (const perfil of Object.keys(ORDEN_POR_PERFIL) as PerfilResumen[]) {
      for (const clave of ORDEN_POR_PERFIL[perfil]) {
        const def = widgetPorClave(clave);
        expect(def).toBeDefined();
        expect(def?.perfiles).toContain(perfil);
      }
    }
  });
});

describe("widgetsDelPerfil", () => {
  const claves = (perfil: PerfilResumen, permissions: Record<string, string | null>, esMaster = false) =>
    widgetsDelPerfil(perfil, { permissions, esMaster }).map((w) => w.clave);

  it("operador con conversaciones y escalaciones: atención, sin costos, plan ni packs", () => {
    const r = claves("operador", { conversations: "read", escalations: "write", settings: "write" });
    expect(r).toEqual(["lista.alertas", "kpi.por_atender", "lista.escalaciones", "acciones.rapidas"]);
    expect(r.some((k) => k.startsWith("kpi.recaudo") || k === "kpi.consumo")).toBe(false);
  });

  it("supervisor de cobranza ve las cifras de cobranza y no las de plan", () => {
    const r = claves("supervisor", { "pack_cobranza:resumen": "write", conversations: "read" });
    expect(r).toEqual(["lista.alertas", "kpi.recaudo_hoy", "kpi.mora", "kpi.promesas_hoy", "lista.actividad"]);
  });

  it("dueño master ve todo lo que tiene dato, sin los pendientes", () => {
    const r = claves("dueno", {}, true);
    expect(r).toContain("kpi.consumo");
    expect(r).toContain("estado.sistema");
    expect(r).toContain("chart.tendencia_atencion");
    expect(r).not.toContain("kpi.resueltas_sin_humano");
  });

  it("nunca devuelve un widget sin permiso", () => {
    const r = claves("dueno", { conversations: "read" });
    expect(r).not.toContain("kpi.consumo");
    expect(r).not.toContain("kpi.por_atender");
    expect(r).toContain("kpi.conversaciones");
  });
});
