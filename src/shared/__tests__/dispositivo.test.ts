jest.mock("expo-secure-store", () => {
  const almacen = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => almacen.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      almacen.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      almacen.delete(k);
    }),
  };
});

jest.mock("expo-application", () => ({
  getAndroidId: jest.fn(() => "ANDROID-DEMO"),
  getIosIdForVendorAsync: jest.fn(async () => "IOS-DEMO"),
}));

import {
  guardarWhatsappVinculacion,
  imeiDelEquipo,
  leerWhatsappVinculacion,
} from "../dispositivo";

describe("dispositivo (HU-39/43)", () => {
  it("devuelve un identificador de equipo", async () => {
    const imei = await imeiDelEquipo();
    expect(typeof imei).toBe("string");
    expect(imei.length).toBeGreaterThan(0);
  });

  it("persiste y lee el WhatsApp de vinculación", async () => {
    await guardarWhatsappVinculacion("3001234567");
    expect(await leerWhatsappVinculacion()).toBe("3001234567");
  });
});
