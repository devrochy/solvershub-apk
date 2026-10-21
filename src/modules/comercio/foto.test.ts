import { FOTO_URL_MAX, esFotoValida } from "./foto";

describe("esFotoValida (HU-CRM-01)", () => {
  it("acepta un link https", () => {
    expect(esFotoValida("https://cdn.tienda.com/casco.jpg")).toBe(true);
    expect(esFotoValida("  HTTPS://cdn.tienda.com/casco.jpg ")).toBe(true);
  });

  it("rechaza lo que la API rechaza", () => {
    for (const url of [
      null,
      "",
      "http://cdn.tienda.com/casco.jpg",
      "javascript:alert(1)",
      "cdn.tienda.com/casco.jpg",
      "https://",
      "https://cdn.tienda.com/mi casco.jpg",
      `https://x.com/${"a".repeat(FOTO_URL_MAX)}`,
    ]) {
      expect(esFotoValida(url)).toBe(false);
    }
  });
});
