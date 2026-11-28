import {
  beneficiosDelPlan,
  creditoDelMes,
  desgloseDelSaldo,
  errorDeRecarga,
  precioDelPlan,
  puedeComprarCreditos,
  recargaEnPalabras,
  topesDelPlan,
} from "./consumo";

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

describe("saldo desglosado y compra de créditos (HU-BILL-27 parte 2b)", () => {
  const AHORA = new Date(2026, 10, 22, 12);
  const saldo = {
    total: 20000,
    month: 12000,
    accumulated: 3000,
    accumulated_expires_at: new Date(2026, 11, 19, 12).toISOString(),
    top_ups: 5000,
    used_month: 12000,
    used_accumulated: 1000,
    used_top_ups: 0,
    bonuses: 0,
    used_bonuses: 0,
    over_balance: 0,
  };

  it("con saldo, la cuenta va sobre el total del ciclo y la barra usa `balance_percent`", () => {
    expect(
      creditoDelMes({ limit: 12000, used: 13000, percent: 108.3, by_agent_truncated: false, balance: saldo, balance_percent: 65 }),
    ).toEqual({ titulo: "Te quedan 7.000 créditos", detalle: "Unos $ 70.000 · Usaste 13.000 de 20.000", porcentaje: 65 });
    const agotado = creditoDelMes({ limit: 12000, used: 20000, percent: 166, by_agent_truncated: false, balance: saldo, balance_percent: 100 });
    expect(agotado?.titulo).toBe("Usaste todo tu saldo de créditos");
  });

  it("desglosa el saldo en mes, acumulado (con vencimiento) y recargas", () => {
    const d = desgloseDelSaldo(saldo, AHORA);
    expect(d?.total).toBe("Saldo total: 20.000 créditos · $ 200.000");
    expect(d?.partes).toEqual([
      { clave: "mes", nombre: "Del mes", uso: "Usaste 12.000 de 12.000", nota: null },
      { clave: "acumulado", nombre: "Acumulado", uso: "Usaste 1.000 de 3.000", nota: "Vence el 19 de dic." },
      { clave: "recargas", nombre: "Recargas", uso: "Usaste 0 de 5.000", nota: null },
    ]);
    const basic = desgloseDelSaldo({ ...saldo, total: 12000, accumulated: 0, used_accumulated: 0, top_ups: 0, accumulated_expires_at: null }, AHORA);
    expect(basic?.partes.map((p) => p.clave)).toEqual(["mes"]);
    expect(desgloseDelSaldo(null)).toBeNull();
  });

  it("los créditos de regalo (SPEC-54) van entre el acumulado y las recargas", () => {
    const d = desgloseDelSaldo({ ...saldo, total: 22000, bonuses: 2000, used_bonuses: 500 }, AHORA);
    expect(d?.partes.map((p) => p.clave)).toEqual(["mes", "acumulado", "regalos", "recargas"]);
    expect(d?.partes[2]).toEqual({ clave: "regalos", nombre: "Regalos", uso: "Usaste 500 de 2.000", nota: null });
  });

  it("paquetes con y sin descuento", () => {
    expect(recargaEnPalabras({ id: "r", creditos: 5000, precio_lista_cop: 50000, descuento_pct: 25, precio_cop: 37500 })).toEqual({
      creditos: "5.000 créditos",
      precio: "$ 37.500",
      lista: "$ 50.000",
      descuento: "−25 %",
    });
    expect(recargaEnPalabras({ id: "r", creditos: 5000, precio_lista_cop: 50000, descuento_pct: 0, precio_cop: 50000 })).toMatchObject({
      lista: null,
      descuento: null,
    });
  });

  it("comprar es del dueño, del master o de quien escribe en plan", () => {
    expect(puedeComprarCreditos({ role: "admin", tenantRole: "owner", permissions: {} })).toBe(true);
    expect(puedeComprarCreditos({ role: "master", permissions: {} })).toBe(true);
    expect(puedeComprarCreditos({ role: "admin", tenantRole: "colaborador", permissions: { plan: "write" } })).toBe(true);
    expect(puedeComprarCreditos({ role: "admin", tenantRole: "colaborador", permissions: { plan: "read" } })).toBe(false);
    expect(puedeComprarCreditos(null)).toBe(false);
  });

  it("los errores: «bajo el mínimo» tal cual; los demás, un texto claro", () => {
    expect(errorDeRecarga("recarga_bajo_minimo", "Esta recarga cuesta $50.000 COP…")).toBe("Esta recarga cuesta $50.000 COP…");
    expect(errorDeRecarga("recarga_no_disponible", "x")).toMatch(/plan pago activo/);
    expect(errorDeRecarga("500", "Ocurrió un error.")).toBe("No pudimos abrir el pago de la recarga. Vuelve a intentarlo.");
  });

  it("Basic (descuento 0) anuncia que puede comprar créditos; Free (null) no", () => {
    const plan = (descuento_recarga: number | null) => ({
      id: "x", name: "X", price_cop: 1, is_free: false, current: false, limits: {}, features: { descuento_recarga },
    });
    expect(beneficiosDelPlan(plan(0))).toContain("Puedes comprar créditos extra");
    expect(beneficiosDelPlan(plan(null))).not.toContain("Puedes comprar créditos extra");
  });
});
