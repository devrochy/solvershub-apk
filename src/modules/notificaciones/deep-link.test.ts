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
