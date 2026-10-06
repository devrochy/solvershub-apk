import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gestorApi, GestorApi } from "../api/gestor";
import { ApiClient } from "@core/api/client";
import {
  apiLogin,
  apiResolverInvitacion,
} from "../api/auth";
import { guardarWhatsappVinculacion, leerWhatsappVinculacion } from "../features/dispositivo/dispositivo";
import {
  clearSession,
  readProfile,
  sessionGateway,
  writeProfile,
  writeSession,
  type UsuarioPerfil,
} from "./token-store";
import type { Invitacion, LoginResult, Negocio } from "@shared/types/auth";

export interface ActualizarPerfilInput {
  nombre: string;
  apellido: string;
}

export interface SessionValue {
  gestor: UsuarioPerfil | null;
  loading: boolean;
  api: GestorApi;
  /** El equipo aún no está vinculado/aprobado (HU-39/43). */
  requiereVinculacion: boolean;
  /** Negocios disponibles cuando el usuario debe elegir (ADR-0081). */
  negociosPendientes: Negocio[];
  /** Token de membresía cuando el usuario solo tiene invitaciones pendientes. */
  membresiaToken: string | null;
  invitaciones: Invitacion[];
  marcarDispositivoVinculado(): void;
  login(usuario: string, password: string): Promise<void>;
  seleccionarNegocio(slug: string): Promise<void>;
  resolverInvitacion(id: string, accion: "aceptar" | "rechazar"): Promise<void>;
  /** Aplica una sesión de campo ya resuelta (p. ej. el exchange admin, ADR-0094). */
  aplicarSesionExterna?(result: LoginResult): Promise<void>;
  logout(): Promise<void>;
  actualizarPerfil(input: ActualizarPerfilInput): Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gestor, setGestor] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiereVinculacion, setRequiereVinculacion] = useState(false);
  const [negociosPendientes, setNegociosPendientes] = useState<Negocio[]>([]);
  const [membresiaToken, setMembresiaToken] = useState<string | null>(null);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  // Credenciales en memoria (nunca persistidas): permiten re-loguear al elegir negocio.
  const credencialesRef = useRef<{ usuario: string; password: string } | null>(null);

  useEffect(() => {
    let activo = true;
    readProfile()
      .then((perfil) => {
        if (activo) {
          setGestor(perfil);
        }
      })
      .finally(() => {
        if (activo) {
          setLoading(false);
        }
      });
    return () => {
      activo = false;
    };
  }, []);

  const api = useMemo(() => gestorApi(new ApiClient(sessionGateway)), []);

  const aplicarSesion = useCallback(async (result: LoginResult) => {
    const perfilBase = result.perfil ?? result.gestor ?? result.propietario;
    const perfilSesion: UsuarioPerfil = {
      id: perfilBase?.id ?? "",
      usuario: perfilBase?.usuario ?? "",
      nombre: perfilBase?.nombre ?? "",
      apellido: perfilBase?.apellido ?? "",
      rol: result.rol ?? "gestor",
    };
    // Prellena el WhatsApp del gestor para la vinculación (HU-39/43).
    if (result.telefono && !(await leerWhatsappVinculacion())) {
      await guardarWhatsappVinculacion(result.telefono);
    }
    if (result.accessToken && result.refreshToken) {
      await writeSession({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    }
    await writeProfile(perfilSesion);
    setGestor(perfilSesion);
    setRequiereVinculacion(Boolean(result.requiereVinculacion));
  }, []);

  const login = useCallback(
    async (usuario: string, password: string) => {
      credencialesRef.current = { usuario, password };
      const result = await apiLogin(usuario, password);

      if (result.seleccionRequerida) {
        setNegociosPendientes(result.negocios ?? []);
        return;
      }
      if (result.requiereMembresia) {
        setMembresiaToken(result.membresiaToken ?? null);
        setInvitaciones(result.invitaciones ?? []);
        return;
      }
      setNegociosPendientes([]);
      setMembresiaToken(null);
      setInvitaciones([]);
      await aplicarSesion(result);
    },
    [aplicarSesion],
  );

  const seleccionarNegocio = useCallback(
    async (slug: string) => {
      const creds = credencialesRef.current;
      if (!creds) {
        return;
      }
      const result = await apiLogin(creds.usuario, creds.password, slug);
      setNegociosPendientes([]);
      await aplicarSesion(result);
    },
    [aplicarSesion],
  );

  const resolverInvitacion = useCallback(
    async (id: string, accion: "aceptar" | "rechazar") => {
      const token = membresiaToken;
      if (!token) {
        return;
      }
      await apiResolverInvitacion(token, id, accion);
      const restantes = invitaciones.filter((i) => i.id !== id);
      setInvitaciones(restantes);
      if (accion === "aceptar") {
        const creds = credencialesRef.current;
        setMembresiaToken(null);
        if (creds) {
          await login(creds.usuario, creds.password);
        }
      } else if (restantes.length === 0) {
        setMembresiaToken(null);
      }
    },
    [membresiaToken, invitaciones, login],
  );

  const marcarDispositivoVinculado = useCallback(() => {
    setRequiereVinculacion(false);
  }, []);

  const logout = useCallback(async () => {
    credencialesRef.current = null;
    await clearSession();
    setGestor(null);
    setRequiereVinculacion(false);
    setNegociosPendientes([]);
    setMembresiaToken(null);
    setInvitaciones([]);
  }, []);

  const actualizarPerfil = useCallback(
    async (input: ActualizarPerfilInput) => {
      const perfil = await api.actualizarPerfil(input);
      const actualizado: UsuarioPerfil = {
        id: perfil.id,
        usuario: perfil.usuario,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        rol: gestor?.rol ?? "gestor",
      };
      await writeProfile(actualizado);
      setGestor(actualizado);
    },
    [api, gestor?.rol],
  );

  const value = useMemo(
    () => ({
      gestor,
      loading,
      api,
      requiereVinculacion,
      negociosPendientes,
      membresiaToken,
      invitaciones,
      marcarDispositivoVinculado,
      login,
      seleccionarNegocio,
      resolverInvitacion,
      aplicarSesionExterna: aplicarSesion,
      logout,
      actualizarPerfil,
    }),
    [
      gestor,
      loading,
      api,
      requiereVinculacion,
      negociosPendientes,
      membresiaToken,
      invitaciones,
      marcarDispositivoVinculado,
      login,
      seleccionarNegocio,
      resolverInvitacion,
      aplicarSesion,
      logout,
      actualizarPerfil,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession debe usarse dentro de SessionProvider");
  }
  return ctx;
}
