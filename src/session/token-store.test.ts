jest.mock("expo-secure-store");

import { Platform } from "react-native";
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
      JSON.stringify({ id: 1, usuario: "c1", nombre: "C", apellido: "L", rol: "gestor" }),
    );

    await writeProfile({ id: 1, usuario: "c1", nombre: "C", apellido: "L", rol: "gestor" });
    await expect(readProfile()).resolves.toEqual({
      id: 1,
      usuario: "c1",
      nombre: "C",
      apellido: "L",
      rol: "gestor",
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
      "cobranza_gestor_profile",
    );
  });
});

describe("token-store (web -> solo memoria)", () => {
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
    jest.clearAllMocks();
    almacen.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: localStorageWeb(),
    });
    jest.replaceProperty(Platform, "OS", "web");
    return clearSession();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    });
    jest.restoreAllMocks();
  });

  it("writeSession guarda en memoria y NO escribe en localStorage", async () => {
    await writeSession({ accessToken: "a", refreshToken: "r" });

    expect(almacen.has("cobranza_access_token")).toBe(false);
    expect(almacen.has("cobranza_refresh_token")).toBe(false);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    await expect(readSession()).resolves.toEqual({
      accessToken: "a",
      refreshToken: "r",
    });
  });

  it("readSession devuelve la sesión guardada en memoria", async () => {
    await writeSession({ accessToken: "a", refreshToken: "r" });

    await expect(readSession()).resolves.toEqual({
      accessToken: "a",
      refreshToken: "r",
    });
  });

  it("clearSession limpia la memoria y deja localStorage intacto", async () => {
    await writeSession({ accessToken: "a", refreshToken: "r" });

    await clearSession();

    await expect(readSession()).resolves.toBeNull();
    expect(almacen.size).toBe(0);
  });

  it("writeProfile/readProfile usan memoria y no persisten en web", async () => {
    const perfil = { id: 1, usuario: "c1", nombre: "C", apellido: "L", rol: "gestor" as const };

    await writeProfile(perfil);

    expect(almacen.size).toBe(0);
    await expect(readProfile()).resolves.toEqual(perfil);
  });
});