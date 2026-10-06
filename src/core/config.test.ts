import { urlArchivo } from "./config";

describe("urlArchivo", () => {
  const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  it("convierte una cartera relativa en URL absoluta del backend", () => {
    expect(urlArchivo("/uploads/clientes/foto.jpg")).toBe(
      `${API_URL}/uploads/clientes/foto.jpg`,
    );
  });

  it("agrega la barra inicial si falta", () => {
    expect(urlArchivo("uploads/clientes/foto.jpg")).toBe(
      `${API_URL}/uploads/clientes/foto.jpg`,
    );
  });

  it("devuelve tal cual una URL completa", () => {
    expect(urlArchivo("https://cdn.example.com/foto.jpg")).toBe(
      "https://cdn.example.com/foto.jpg",
    );
  });

  it("devuelve null para null, vacío o undefined", () => {
    expect(urlArchivo(null)).toBeNull();
    expect(urlArchivo(undefined)).toBeNull();
    expect(urlArchivo("")).toBeNull();
  });

  it("extrae la parte /uploads/ de un path absoluto del filesystem (cache viejo)", () => {
    expect(
      urlArchivo("/Users/roaguilar/Projects/app-cobranza/uploads/clientes/foto.jpg"),
    ).toBe(`${API_URL}/uploads/clientes/foto.jpg`);
  });
});