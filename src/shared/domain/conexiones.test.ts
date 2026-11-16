import { detalleDeConexion } from "./conexiones";

describe("detalleDeConexion", () => {
  it("muestra nombre y número del WhatsApp Web vinculado", () => {
    expect(
      detalleDeConexion({
        type_id: "whatsapp_waweb",
        external_id: "waweb:tenant",
        display_name: "Ana",
        display_phone_number: "573005550103",
      }),
    ).toBe("Ana · +573005550103");
  });

  it("oculta el identificador técnico de WhatsApp Web sin identidad", () => {
    expect(
      detalleDeConexion({ type_id: "whatsapp_waweb", external_id: "waweb:tenant" }),
    ).toBeNull();
  });

  it("muestra el @usuario del bot de Telegram y nunca su id", () => {
    expect(
      detalleDeConexion({ type_id: "telegram", external_id: "1234567890", display_name: "@mitienda_bot" }),
    ).toBe("@mitienda_bot");
    expect(detalleDeConexion({ type_id: "telegram", external_id: "1234567890" })).toBeNull();
  });

  it("conserva el identificador de los demás canales", () => {
    expect(detalleDeConexion({ external_id: "ana@demo.test" })).toBe("ana@demo.test");
    expect(
      detalleDeConexion({
        type_id: "whatsapp_meta",
        external_id: "123",
        display_phone_number: "573005550103",
      }),
    ).toBe("+573005550103");
  });
});
