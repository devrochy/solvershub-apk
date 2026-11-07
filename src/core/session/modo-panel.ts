import { useCallback, useState } from "react";
import { ApiAuthError } from "@core/api/auth-admin";

/**
 * «Modo panel»: la sesión admin actual se opera como panel (sin app de campo). Lo enciende
 * quien lo decide (el 403 `sin_acceso_campo` del intercambio a campo, o la hidratación de una
 * sesión admin sin tokens de campo) y vale solo para la sesión que lo encendió, identificada por
 * `clave` (ver `claveDeSesion`): cerrar sesión o entrar con otro usuario lo apaga, y una sesión de
 * campo con rol `gestor` siempre gana (apk#220).
 */
export function useModoPanel(clave: string | null, rolDeCampo: string | null) {
  const [forzado, setForzado] = useState(false);
  const [claveVista, setClaveVista] = useState(clave);
  // Ajuste de estado durante el render (patrón de React): sin un render intermedio con el panel viejo.
  if (clave !== claveVista) {
    setClaveVista(clave);
    setForzado(false);
  }
  const entrarPanel = useCallback(() => setForzado(true), []);
  const deCampoDePanel = rolDeCampo !== null && rolDeCampo !== "gestor";
  const enPanel = deCampoDePanel || (forzado && rolDeCampo !== "gestor");
  return { enPanel, entrarPanel };
}

/**
 * Clave de la sesión admin: su token, que cambia en cada inicio de sesión. No sirve `adminId`: el
 * backend responde el login con `admin_id` y la app lee `adminId`, así que en sesiones reales
 * llega `undefined` y la clave sería siempre `null` (el modo panel no se apagaba, apk#220).
 */
export function claveDeSesion(sesion: { token: string } | null | undefined): string | null {
  return sesion?.token ?? null;
}

export interface ReintentoDeCampo {
  token: string | null;
  negocio: string | null;
  hayCampo: boolean;
  pedirCampo(token: string, negocio: string): Promise<unknown>;
  aplicarCampo(campo: unknown): Promise<void>;
  entrarPanel(): void;
}

/**
 * Tras aprobar el equipo repite el intercambio a campo que el 403 había frenado, sin pedir la
 * clave. No depende del modo panel: la hidratación lo enciende para toda sesión admin sin campo,
 * y si bloqueaba el reintento el gestor aprobado terminaba en el panel (apk#220).
 */
export async function reintentarCampoAprobado(d: ReintentoDeCampo): Promise<void> {
  if (!d.token || !d.negocio || d.hayCampo) return;
  try {
    await d.aplicarCampo(await d.pedirCampo(d.token, d.negocio));
  } catch (err) {
    if (err instanceof ApiAuthError && err.status === 403 && err.code === "sin_acceso_campo") {
      d.entrarPanel();
    }
  }
}
