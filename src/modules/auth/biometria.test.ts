jest.mock("expo-secure-store");
jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

import * as SecureStore from "expo-secure-store";
import {
  autenticarBiometria,
  biometriaDisponible,
  biometriaHabilitada,
  deshabilitarBiometria,
  habilitarBiometria,
} from "./biometria";

describe("biometria", () => {
  beforeEach(() => jest.clearAllMocks());

  it("está disponible solo con hardware y biometría enrolada", async () => {
    await expect(biometriaDisponible()).resolves.toBe(true);
  });

  it("habilita y deshabilita persistiendo en secure-kv", async () => {
    await habilitarBiometria();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("solvershub_biometria_habilitada", "1");

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("1");
    await expect(biometriaHabilitada()).resolves.toBe(true);

    await deshabilitarBiometria();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("solvershub_biometria_habilitada", "0");
  });

  it("autentica con el prompt indicado", async () => {
    const ok = await autenticarBiometria("Desbloquea SolversHub");
    expect(ok).toBe(true);
    expect(
      require("expo-local-authentication").authenticateAsync,
    ).toHaveBeenCalledWith({ promptMessage: "Desbloquea SolversHub", disableDeviceFallback: false });
  });
});
