import { useCallback, useState } from "react";
import { ApiAuthError } from "@core/api/auth-admin";
import { esCodigoDeEquipo } from "@shared/acceso-evento";

/**
 * «Modo panel»: la sesión admin actual se opera como panel (sin app de campo). Lo enciende
 * quien lo decide (`resolverModo`, o el 403 `sin_acceso_campo` del login) y vale solo para la
 * sesión que lo encendió, identificada por `clave` (ver `claveDeSesion`): cerrar sesión o entrar
 * con otro usuario lo apaga, y una sesión de campo con rol `gestor` siempre gana (apk#220).
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
  const salirDelPanel = useCallback(() => setForzado(false), []);
  const deCampoDePanel = rolDeCampo !== null && rolDeCampo !== "gestor";
  const enPanel = deCampoDePanel || (forzado && rolDeCampo !== "gestor");
  return { enPanel, entrarPanel, salirDelPanel };
}

/**
 * Clave de la sesión admin: su token, que cambia en cada inicio de sesión (también cuando el mismo
 * usuario vuelve a entrar) y existe aunque una sesión guardada antigua no traiga `adminId`.
 */
export function claveDeSesion(sesion: { token: string } | null | undefined): string | null {
  return sesion?.token ?? null;
}

/**
 * Qué hacer con la respuesta del intercambio a campo (`gestor-token`). Es la única regla de la app
 * para elegir entre panel y campo (apk#270), igual en el login, al aprobar el equipo y al arrancar:
 * - sesión de campo con rol `gestor` → `campo` (perfil de gestor en un negocio con Cobranza activa);
 * - sesión de campo con otro rol o 403 `sin_acceso_campo` → `panel`;
 * - 403 de equipo → `espera` (la raíz ya muestra la pantalla de espera o bloqueo);
 * - cualquier otro error (red, servidor) → `sin_respuesta`: el que llama aplica su respaldo.
 */
export type ModoDeEntrada = "campo" | "panel" | "espera" | "sin_respuesta";

export function decidirModo(r: { campo: { rol?: string | null } } | { error: unknown }): ModoDeEntrada {
  if ("campo" in r) return (r.campo.rol ?? "gestor") === "gestor" ? "campo" : "panel";
  const err = r.error;
  if (err instanceof ApiAuthError && err.status === 403) {
    if (esCodigoDeEquipo(err.code)) return "espera";
    if (err.code === "sin_acceso_campo") return "panel";
  }
  return "sin_respuesta";
}

export interface ResolucionDeModo {
  token: string | null;
  negocio: string | null;
  /** Hay un perfil de campo aplicado o guardado en el equipo. */
  hayCampo: boolean;
  pedirCampo(token: string, negocio: string): Promise<{ rol?: string | null }>;
  aplicarCampo(campo: { rol?: string | null }): Promise<void>;
  /** Cierra la sesión de campo guardada (el backend ya no la emite). */
  descartarCampo(): Promise<void>;
  entrarPanel(): void;
  salirDelPanel(): void;
  /** La sesión admin sigue siendo la misma que pidió (no hubo cierre ni cambio de usuario). */
  vigente?(): boolean;
  /** Aplica el respaldo antes de preguntar (arranque en frío: sin esperar a la red). */
  respaldoInmediato?: boolean;
}

/**
 * Pregunta al backend con la sesión admin y aplica `decidirModo`. La usan la aprobación del equipo
 * y el arranque en frío, así que los dos caminos llegan al mismo modo para la misma cuenta (apk#270).
 * Sin respuesta, el respaldo también es uno solo: con perfil de campo se queda en campo (la app de
 * campo funciona sin red) y sin él, panel. Devuelve el modo decidido.
 */
export async function resolverModo(d: ResolucionDeModo): Promise<ModoDeEntrada> {
  const respaldo = (): ModoDeEntrada => {
    if (!d.hayCampo) d.entrarPanel();
    return "sin_respuesta";
  };
  if (!d.token || !d.negocio) return respaldo();
  if (d.respaldoInmediato) respaldo();
  let campo: { rol?: string | null } | null = null;
  let modo: ModoDeEntrada;
  try {
    campo = await d.pedirCampo(d.token, d.negocio);
    modo = decidirModo({ campo });
  } catch (error) {
    modo = decidirModo({ error });
  }
  if (d.vigente && !d.vigente()) return modo;
  switch (modo) {
    case "campo":
      // Primero la sesión (su rol `gestor` ya le gana al panel), luego el panel viejo: sin un
      // render intermedio sin modo.
      await d.aplicarCampo(campo as { rol?: string | null });
      d.salirDelPanel();
      break;
    case "panel":
      // Con otro rol, la sesión de campo se aplica (su rol ya abre el panel); sin acceso de
      // campo, la guardada sobra: un gestor guardado le ganaría al panel.
      if (campo) await d.aplicarCampo(campo);
      else if (d.hayCampo) await d.descartarCampo();
      d.entrarPanel();
      break;
    case "espera":
      break;
    case "sin_respuesta":
      return respaldo();
  }
  return modo;
}
