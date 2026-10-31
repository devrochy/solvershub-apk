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
  idDelEquipo,
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

describe("identidad del equipo para la política de dispositivos (HU-ACC-05)", () => {
  it("idDelEquipo devuelve id, etiqueta y plataforma", async () => {
    const equipo = await idDelEquipo();
    expect(equipo.plataforma === "android" || equipo.plataforma === "ios").toBe(true);
    expect(typeof equipo.label).toBe("string");
    expect(equipo.label.length).toBeLessThanOrEqual(80);
    expect(typeof equipo.id).toBe("string");
  });
});
