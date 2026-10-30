import { Linking } from "react-native";
import { emitirNavegacion } from "@shared/navegacion-evento";
import type { KpiResumen } from "./api";
import { destinoDeResumen, urlDeResumen } from "./destinos";
import { propsDeKpi, valorDeKpi } from "./kpi";

jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

function kpi(parcial: Partial<KpiResumen>): KpiResumen {
  return {
    id: "k",
    label: "K",
    valor: 1,
    unidad: "count",
    previo: null,
    delta_pct: null,
    polaridad: "up-good",
    ...parcial,
  };
}

describe("valorDeKpi (ADR-0171)", () => {
  it.each([
    [kpi({ valor: 1234, unidad: "count" }), "1.234"],
    [kpi({ valor: 12.34, unidad: "pct" }), "12,3 %"],
    [kpi({ valor: 1.5, unidad: "usd" }), "US$ 1,50"],
    [kpi({ valor: 1250000, unidad: "money" }), "$ 1.250.000"],
    [kpi({ valor: 850, unidad: "ms" }), "850 ms"],
    [kpi({ valor: 2500, unidad: "ms" }), "2,5 s"],
    [kpi({ valor: null }), "—"],
  ])("%j → %s", (k, esperado) => {
    expect(valorDeKpi(k)).toBe(esperado);
  });
});

describe("propsDeKpi", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lleva delta, polaridad y contra qué se compara", () => {
    const p = propsDeKpi(kpi({ delta_pct: 20, polaridad: "up-bad" }));
    expect(p.delta).toBe(20);
    expect(p.polarity).toBe("up-bad");
    expect(p.period).toBe("frente a los 7 días anteriores");
    expect(propsDeKpi(kpi({ delta_pct: 5, versus: "el mes anterior" })).period).toBe(
      "frente al mes anterior",
    );
  });

  it("sin delta no inventa variación", () => {
    const p = propsDeKpi(kpi({ delta_pct: null }));
    expect(p.delta).toBeUndefined();
    expect(p.period).toBeUndefined();
  });

  it("con pantalla en la app navega; sin ella abre el panel; sin destino no inventa enlace", () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
    const p = propsDeKpi(kpi({ destino: { ruta: "comercio.pedidos", params: {} } }));
    p.onPress?.();
    expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "comercio", pestana: "pedidos" });

    const agente = propsDeKpi(
      kpi({ destino: { ruta: "agente", params: { ref: "x", pestana: "consumo" } } }),
      { tenantId: "t-1" },
    );
    agente.onPress?.();
    expect(abrir).toHaveBeenCalledWith(expect.stringContaining("/agentes/x?tab=consumo"));

    expect(propsDeKpi(kpi({})).onPress).toBeUndefined();
    abrir.mockRestore();
  });
});

describe("destinoDeResumen", () => {
  it.each([
    ["conversaciones", { tab: "conversaciones", pestana: "conversaciones" }],
    ["escalaciones", { tab: "conversaciones", pestana: "escalaciones" }],
    ["leads", { tab: "conversaciones", pestana: "leads" }],
    ["costos", { tab: "negocio", pestana: "costos" }],
    ["calendario.citas", { tab: "calendario", pestana: "semana" }],
    ["cobranza.pagos", { tab: "cobranza", pestana: "pagos" }],
    ["cobranza.carteras", { tab: "cobranza", pestana: "carteras" }],
    ["cobranza.promesas", { tab: "cobranza", pestana: "promesas" }],
  ])("%s", (ruta, esperado) => {
    expect(destinoDeResumen({ ruta, params: {} })).toEqual(esperado);
  });

  it("las pantallas que la app no tiene (agentes, suscripciones) no tienen destino", () => {
    expect(destinoDeResumen({ ruta: "agente", params: { ref: "a" } })).toBeUndefined();
    expect(destinoDeResumen({ ruta: "suscripciones", params: {} })).toBeUndefined();
    expect(destinoDeResumen(null)).toBeUndefined();
    // Pero sí tienen URL del panel: la cifra nunca queda muerta.
    expect(urlDeResumen({ ruta: "agente", params: { ref: "a" } }, "t-1")).toContain("/agentes/a");
    expect(urlDeResumen({ ruta: "suscripciones.lista", params: { estado: "activa" } }, "t-1")).toContain(
      "/suscripciones/lista?estado=activa",
    );
  });
});
