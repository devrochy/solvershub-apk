import {
  conexionDelChat,
  estadoDeConversacion,
  estadoDeEscalacion,
  etiquetaDelMotivo,
  formatearCostoYTokens,
  formatearDia,
  formatearHoraChat,
  nombreDelChat,
  tipoDelChat,
  tonoDelMotivo,
} from "./presentacion";

describe("presentación de la bandeja", () => {
  it("elige el nombre y la conexión como el panel", () => {
    expect(nombreDelChat({ customer_name: "Ana", external_id: "wa-1" })).toBe("Ana");
    expect(nombreDelChat({ customer_name: null, external_id: "wa-1" })).toBe("wa-1");
    expect(nombreDelChat({ customer_name: null, external_id: null })).toBe("Cliente");
    expect(
      conexionDelChat({ channel: "whatsapp", connection_type: "whatsapp_cloud", connection_label: "Ventas" }),
    ).toBe("WhatsApp Cloud · Ventas");
    expect(tipoDelChat({ channel: "whatsapp", connection_type: "desconocido" })).toBe("whatsapp");
  });

  it("formatea la hora de hoy y la fecha de otros días", () => {
    const ahora = new Date(2026, 9, 6, 15, 0, 0);
    expect(formatearHoraChat(new Date(2026, 9, 6, 10, 30, 0), ahora)).not.toBe("");
    expect(formatearHoraChat(new Date(2026, 9, 5, 10, 30, 0), ahora)).not.toBe("");
    expect(formatearHoraChat(null, ahora)).toBe("");
  });

  it("nombra los días relativos", () => {
    const ahora = new Date(2026, 9, 6, 15, 0, 0);
    expect(formatearDia(new Date(2026, 9, 6, 10, 0, 0), ahora)).toBe("Hoy");
    expect(formatearDia(new Date(2026, 9, 5, 10, 0, 0), ahora)).toBe("Ayer");
    expect(formatearDia(new Date(2026, 8, 30, 10, 0, 0), ahora)).toContain("septiembre");
  });

  it("traduce estados y motivos con su tono", () => {
    expect(estadoDeConversacion("escalated").label).toBe("Escalada");
    expect(estadoDeConversacion("otro").label).toBe("otro");
    expect(estadoDeEscalacion("pendiente").label).toBe("Pendiente");
    expect(estadoDeEscalacion("asignada").tone).toBe("info");
    expect(tonoDelMotivo("queja")).toBe("warning");
    expect(tonoDelMotivo("falla_ia")).toBe("danger");
    expect(tonoDelMotivo("solicitud_cliente")).toBe("info");
    expect(tonoDelMotivo("accion_habilidad")).toBe("accent");
    expect(etiquetaDelMotivo({ reason_code: "queja" })).toBe("Queja");
    expect(etiquetaDelMotivo({ reason_code: "otro", reason: "motivo libre" })).toBe("Otro");
  });

  it("resume costo y tokens", () => {
    expect(formatearCostoYTokens(0.02, 1500)).toContain("1.500 tokens");
  });
});
