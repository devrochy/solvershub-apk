jest.mock("expo-secure-store");

import * as SecureStore from "expo-secure-store";
import {
  clearSession,
  readProfile,
  readSession,
  writeProfile,
  writeSession,
} from "./token-store";

describe("token-store (nativo -> expo-secure-store)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("writeSession guarda access y refresh en secure-store", async () => {
    await writeSession({ accessToken: "a", refreshToken: "r" });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "cobranza_access_token",
      "a",
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "cobranza_refresh_token",
      "r",
    );
  });

  it("readSession devuelve null si no hay tokens", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    await expect(readSession()).resolves.toBeNull();
  });

  it("writeProfile guarda el perfil y readProfile lo recupera", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
      JSON.stringify({ id: 1, usuario: "c1", nombre: "C", apellido: "L" }),
    );

    await writeProfile({ id: 1, usuario: "c1", nombre: "C", apellido: "L" });
    await expect(readProfile()).resolves.toEqual({
      id: 1,
      usuario: "c1",
      nombre: "C",
      apellido: "L",
    });
  });

  it("clearSession borra tokens y perfil", async () => {
    await clearSession();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "cobranza_access_token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "cobranza_refresh_token",
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
      "cobranza_cobrador_profile",
    );
  });
});

describe("token-store (web -> fallback a localStorage)", () => {
  const almacen = new Map<string, string>();

  function localStorageWeb() {
    return {
      getItem: (k: string) => almacen.get(k) ?? null,
      setItem: (k: string, v: string) => {
        almacen.set(k, v);
      },
      removeItem: (k: string) => {
        almacen.delete(k);
      },
    };
  }

  beforeEach(() => {
    almacen.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageWeb(),
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    });
  });

  it("writeSession guarda en localStorage sin tocar secure-store", async () => {
    await writeSession({ accessToken: "a", refreshToken: "r" });

    expect(almacen.get("cobranza_access_token")).toBe("a");
    expect(almacen.get("cobranza_refresh_token")).toBe("r");
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it("readSession devuelve la sesión guardada en localStorage", async () => {
    almacen.set("cobranza_access_token", "a");
    almacen.set("cobranza_refresh_token", "r");

    await expect(readSession()).resolves.toEqual({
      accessToken: "a",
      refreshToken: "r",
    });
  });

  it("clearSession limpia localStorage", async () => {
    almacen.set("cobranza_access_token", "a");

    await clearSession();

    expect(almacen.has("cobranza_access_token")).toBe(false);
  });
});