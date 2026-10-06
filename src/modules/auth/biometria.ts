import * as LocalAuthentication from "expo-local-authentication";
import { secureGet, secureSet } from "@core/secure-kv";
import { CLAVE_BIOMETRIA } from "./types";

/**
 * Biometría de la app oficial (HU-APP-02): desbloqueo opt-in por huella/rostro.
 * La habilitación es del dispositivo (no del servidor); la clave maestra de la
 * base cifrada (HU-APP-06) exigirá autenticación en SecureStore aparte.
 */

export async function biometriaDisponible(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return Boolean(hardware && enrolled);
}

export async function biometriaHabilitada(): Promise<boolean> {
  return (await secureGet(CLAVE_BIOMETRIA)) === "1";
}

export async function habilitarBiometria(): Promise<void> {
  await secureSet(CLAVE_BIOMETRIA, "1");
}

export async function deshabilitarBiometria(): Promise<void> {
  await secureSet(CLAVE_BIOMETRIA, "0");
}

/** Autentica con el biometrico del equipo. Devuelve true si pasó. */
export async function autenticarBiometria(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    disableDeviceFallback: false,
  });
  return result.success;
}
