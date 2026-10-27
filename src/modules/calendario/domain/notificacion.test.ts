import { describirAviso } from "./notificacion";

describe("aviso al cliente (HU-CAL-05)", () => {
  it("sin aviso devuelve solo lo hecho", () => {
    expect(describirAviso("Cita movida.", null)).toBe("Cita movida.");
  });

  it("cuenta correo y WhatsApp por separado", () => {
    expect(
      describirAviso("Cita movida.", { email_sent: true, whatsapp_sent: true, email_reason: "" }),
    ).toContain("correo y WhatsApp");
    expect(
      describirAviso("Cita movida.", { email_sent: true, whatsapp_sent: false, email_reason: "" }),
    ).toContain("el WhatsApp no salió");
    expect(
      describirAviso("Cita movida.", {
        email_sent: false,
        whatsapp_sent: true,
        email_reason: "no_connection",
      }),
    ).toContain("no hay una conexión de correo activa");
    expect(
      describirAviso("Cita movida.", { email_sent: false, whatsapp_sent: false, email_reason: "sin_destinatarios" }),
    ).toContain("la cita no tiene email del cliente");
  });
});
