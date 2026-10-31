import { tabDelPanelParaPush } from "./deep-link";

describe("tabDelPanelParaPush (HU-APP-05, deep link en el panel)", () => {
  it("una escalación lleva a Conversaciones", () => {
    expect(tabDelPanelParaPush({ type: "core.escalation", conversationId: "c-1" })).toBe(
      "conversaciones",
    );
  });

  it("la actividad de campo del gestor lleva a Cobranza", () => {
    expect(tabDelPanelParaPush({ type: "cobranza.sync" })).toBe("cobranza");
  });

  it("un tipo desconocido o sin datos no navega", () => {
    expect(tabDelPanelParaPush({ type: "otro" })).toBeNull();
    expect(tabDelPanelParaPush(undefined)).toBeNull();
  });
});

describe("destinoDeNotificacion / destinoDePush (ADR-0167)", () => {
  const { destinoDeNotificacion, destinoDePush } = jest.requireActual("./deep-link") as typeof import("./deep-link");
  const t = (entity: string, section: string | null = null) => ({ entity, id: "x", section });

  it("traduce el destino neutro a módulo y pestaña del panel", () => {
    expect(destinoDeNotificacion(t("conversacion", "escalations"))).toEqual({ tab: "conversaciones", pestana: "escalaciones" });
    expect(destinoDeNotificacion(t("lead"))).toEqual({ tab: "conversaciones", pestana: "leads" });
    expect(destinoDeNotificacion(t("pedido"))).toEqual({ tab: "comercio", pestana: "pedidos" });
    expect(destinoDeNotificacion(t("cita"))).toEqual({ tab: "calendario", pestana: "semana" });
    expect(destinoDeNotificacion(t("conexion"))).toEqual({ tab: "configuracion", pestana: "conexiones" });
  });

  it("un aviso de cliente abre su ficha (HU-CRM-20)", () => {
    expect(destinoDeNotificacion({ entity: "cliente", id: "cli-1", section: "leads" })).toEqual({
      tab: "conversaciones",
      pestana: "leads",
      cliente: "cli-1",
    });
  });

  it("un aviso de cliente sin id, o uno de lead (su id es el del lead), abre la lista", () => {
    expect(destinoDeNotificacion({ entity: "cliente", id: "", section: "leads" })).toEqual({
      tab: "conversaciones",
      pestana: "leads",
    });
    expect(destinoDeNotificacion({ entity: "lead", id: "lead-9", section: "leads" })).toEqual({
      tab: "conversaciones",
      pestana: "leads",
    });
  });

  it("el push de cliente lleva a la ficha, también el que abre la app cerrada", () => {
    expect(destinoDePush({ target: { entity: "cliente", id: "cli-1", section: "leads" } })).toEqual({
      tab: "conversaciones",
      pestana: "leads",
      cliente: "cli-1",
    });
  });

  it("una entidad sin pantalla en la app no navega", () => {
    expect(destinoDeNotificacion(t("desconocida"))).toBeNull();
    expect(destinoDeNotificacion(null)).toBeNull();
  });

  it("el push prefiere el target neutro y cae al type legado", () => {
    expect(destinoDePush({ target: t("pedido") })).toEqual({ tab: "comercio", pestana: "pedidos" });
    expect(destinoDePush({ type: "core.escalation" })).toEqual({ tab: "conversaciones" });
    expect(destinoDePush({ type: "otro" })).toBeNull();
    expect(destinoDePush(undefined)).toBeNull();
  });
});
