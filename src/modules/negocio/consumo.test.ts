import { beneficiosDelPlan, creditoDelMes, precioDelPlan, topesDelPlan } from "./consumo";

const uso = (key: string, used: number, limit: number | null) => ({
  key,
  label: key,
  unit: key,
  used,
  limit,
  percent: limit ? (used / limit) * 100 : null,
  scope: "lifetime",
  exceeded: false,
});

describe("consumo del plan v3 (HU-BILL-27)", () => {
  it("el crédito del mes dice lo que queda y su equivalente en pesos", () => {
    expect(creditoDelMes({ limit: 12000, used: 2500.4, percent: 20.8, by_agent_truncated: false })).toEqual({
      titulo: "Te quedan 9.500 créditos",
      detalle: "Unos $ 95.000 · Usaste 2.500 de 12.000",
      porcentaje: 20.8,
    });
  });

  it("con el crédito agotado lo dice y la barra queda llena", () => {
    const c = creditoDelMes({ limit: 1500, used: 1600, percent: 100, by_agent_truncated: false });
    expect(c?.titulo).toBe("Usaste todo el crédito del mes");
    expect(c?.porcentaje).toBe(100);
  });

  it("sin crédito no hay tarjeta; sin medición no hay barra", () => {
    expect(creditoDelMes(null)).toBeNull();
    expect(creditoDelMes({ limit: 40000, used: null, by_agent_truncated: false })?.porcentaje).toBeNull();
  });

  it("solo pinta los topes estructurales, en orden, y nunca las métricas retiradas", () => {
    const topes = topesDelPlan([
      uso("correos", 0, 1),
      uso("conversaciones_audio", 3, 50),
      uso("costo_llm_usd", 1, 10),
      uso("creditos", 100, null),
      uso("clientes", 12, null),
      uso("colaboradores", 2, 5),
      uso("agentes", 1, 2),
      uso("conexiones", 2, 2),
    ]);
    expect(topes.map((t) => t.clave)).toEqual(["agentes", "colaboradores", "clientes", "conexiones", "correos"]);
    expect(topes.find((t) => t.clave === "clientes")).toMatchObject({ uso: "12, sin límite", porcentaje: null });
    expect(topes.find((t) => t.clave === "conexiones")).toMatchObject({ uso: "2 de 2", porcentaje: 100 });
    expect(topes.find((t) => t.clave === "colaboradores")?.titulo).toBe("Personas del equipo");
  });

  it("precio y beneficios del catálogo v3", () => {
    const premium = {
      id: "premium",
      name: "Premium",
      price_cop: 299000,
      monthly_credits: 40000,
      is_free: false,
      current: false,
      limits: { clientes: 5000, agentes: 5, colaboradores: 15, conexiones: 6, correos: 3, documentos: 100 },
      features: {
        canales: ["whatsapp", "web", "telegram", "instagram", "messenger"],
        nivel_ia: "avanzado",
        acumulable_meses: 1,
        descuento_recarga: 15,
        marca_propia: true,
        byok: false,
        historial_dias: 365,
        soporte: "prioritario",
      },
    };
    expect(precioDelPlan(premium)).toBe("$ 299.000 al mes");
    expect(beneficiosDelPlan(premium)).toEqual([
      "40.000 créditos al mes",
      "5 agentes",
      "15 personas del equipo",
      "5.000 clientes",
      "6 conexiones",
      "3 correos",
      "WhatsApp, Chat web, Telegram, Instagram, Messenger",
      "IA avanzada",
      "El crédito que sobra se acumula 1 mes",
      "15 % de descuento en recargas",
      "Tu propia marca",
      "Historial de 365 días",
      "Soporte prioritario",
    ]);
  });

  it("Free: gratis, sin correos y sin límites como «sin límite»", () => {
    const free = {
      id: "free",
      name: "Free",
      price_cop: 0,
      monthly_credits: 1500,
      is_free: true,
      current: true,
      limits: { agentes: 1, correos: 0, clientes: null },
      features: {},
    };
    expect(precioDelPlan(free)).toBe("Gratis");
    expect(beneficiosDelPlan(free)).toEqual(["1.500 créditos al mes", "1 agente", "Clientes sin límite", "Sin correos"]);
  });
});
