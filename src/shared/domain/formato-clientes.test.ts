import {
  etiquetaCanal,
  etiquetaClasificacion,
  etiquetaRiesgo,
  enlaceTelefono,
  enlaceWhatsApp,
  formatearCop,
  formatearFecha,
  telefonoVisible,
  tonoDeRiesgo,
  ubicacionVisible,
  urlAvatarCliente,
} from "./formato-clientes";

describe("formato-clientes", () => {
  it("formatea montos en pesos sin decimales", () => {
    expect(formatearCop(1234567)).toBe("$ 1.234.567");
    expect(formatearCop("2500")).toBe("$ 2.500");
    expect(formatearCop(null)).toBe("—");
  });

  it("formatea fechas y devuelve — si no hay dato", () => {
    expect(formatearFecha("2026-10-21T12:00:00Z")).toMatch(/^21\/10\/\d{2}$/);
    expect(formatearFecha(null)).toBe("—");
    expect(formatearFecha("no-es-fecha")).toBe("—");
  });

  it("prefiere indicativo + local para el teléfono", () => {
    expect(telefonoVisible({ phone_indicativo: "+57", phone_local: "300 111 2233" })).toBe(
      "+57 300 111 2233",
    );
    expect(telefonoVisible({ phone_e164: "+573001112233" })).toBe("+573001112233");
    expect(telefonoVisible(null)).toBe("—");
  });

  it("arma la ubicación con municipio y departamento", () => {
    expect(ubicacionVisible({ municipio: "Bogotá", departamento: "Cundinamarca" })).toBe(
      "Bogotá, Cundinamarca",
    );
    expect(ubicacionVisible({ address: "Calle 12" })).toBe("Calle 12");
    expect(ubicacionVisible(null)).toBe("—");
  });

  it("resuelve la URL del avatar contra el backend", () => {
    expect(urlAvatarCliente("https://cdn.test/a.jpg")).toBe("https://cdn.test/a.jpg");
    expect(urlAvatarCliente("/api/v1/files/token")).toMatch(/^http:\/\/localhost:3000\/api\/v1\/files\/token$/);
    expect(urlAvatarCliente(null)).toBeNull();
  });

  it("traduce canal, clasificación y riesgo", () => {
    expect(etiquetaCanal("whatsapp")).toBe("WhatsApp");
    expect(etiquetaClasificacion("nuevo")).toBe("Nuevo");
    expect(etiquetaClasificacion("vip")).toBe("VIP");
    expect(etiquetaClasificacion(undefined)).toBe("Sin clasificar");
    expect(etiquetaRiesgo("rojo")).toBe("Riesgo alto");
    expect(tonoDeRiesgo("rojo")).toBe("danger");
    expect(tonoDeRiesgo("azul")).toBe("info");
    expect(tonoDeRiesgo("blanco")).toBe("neutral");
  });
});

describe("enlaces de contacto", () => {
  it("arma WhatsApp solo con un teléfono usable", () => {
    expect(enlaceWhatsApp("+57 300 111 2233", "Juana")).toBe(
      "https://wa.me/573001112233?text=Hola%20Juana",
    );
    expect(enlaceWhatsApp("123")).toBeNull();
    expect(enlaceWhatsApp(null)).toBeNull();
  });

  it("arma tel: solo con un teléfono usable", () => {
    expect(enlaceTelefono("+57 300 111 2233")).toBe("tel:+573001112233");
    expect(enlaceTelefono("12")).toBeNull();
  });
});
