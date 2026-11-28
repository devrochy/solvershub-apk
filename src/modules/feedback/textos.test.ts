import { AdminApiError } from "@core/api/admin";
import { EnvioError } from "./api";
import { estadoEnPalabras, mensajeDeEnvio, validarTextos } from "./textos";
import { puedeVerDelNegocio } from "./catalogo";

describe("textos de reportes (HU-FB-07)", () => {
  it("aprobado con créditos lleva el regalo, como en el panel", () => {
    expect(estadoEnPalabras({ estado: "aprobado", creditos_otorgados: 3000 })).toBe("Aprobado · 3.000 créditos de regalo");
    expect(estadoEnPalabras({ estado: "recibido", creditos_otorgados: null })).toBe("Recibido");
  });

  it("valida el título (3 a 120) y la descripción (10 a 2000)", () => {
    expect(validarTextos("ok", "corta")).toEqual({
      titulo: "El título debe tener entre 3 y 120 caracteres.",
      descripcion: "La descripción debe tener entre 10 y 2.000 caracteres.",
    });
    expect(validarTextos("Agenda", "No carga la agenda del martes")).toEqual({});
  });

  it("413, 422 y 429 tienen mensajes claros; sin respuesta es error de red", () => {
    expect(mensajeDeEnvio(new AdminApiError(413, "adjunto_muy_grande", "x")).texto).toBe(
      "Una imagen pesa más de 8 MB. Quítala o elige otra.",
    );
    expect(mensajeDeEnvio(new AdminApiError(422, "demasiados_adjuntos", "x")).texto).toBe("Puedes adjuntar hasta 5 imágenes.");
    expect(mensajeDeEnvio(new EnvioError(new AdminApiError(429, "demasiados_reportes", "x"), 1800)).texto).toBe(
      "Enviaste muchos reportes seguidos. Vuelve a intentarlo en 30 minutos.",
    );
    expect(mensajeDeEnvio(new AdminApiError(422, "otro_codigo", "Mensaje del servidor")).texto).toBe("Mensaje del servidor");
    expect(mensajeDeEnvio(new TypeError("Network request failed"))).toEqual({
      texto: "No hay conexión. Tu reporte quedó guardado: vuelve a enviarlo cuando tengas señal.",
      red: true,
    });
  });

  it("el filtro «Del negocio» es del owner (y master o tester)", () => {
    expect(puedeVerDelNegocio({ role: "admin", tenantRole: "owner" })).toBe(true);
    expect(puedeVerDelNegocio({ role: "master", tenantRole: null })).toBe(true);
    expect(puedeVerDelNegocio({ role: "admin", tenantRole: "colaborador" })).toBe(false);
    expect(puedeVerDelNegocio(null)).toBe(false);
  });
});
