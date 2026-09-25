import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { gestorApi, GestorApi } from "../api/gestor";
import { ApiClient } from "../api/client";
import { apiLogin, RolLogin } from "../api/auth";
import {
  clearSession,
  readProfile,
  sessionGateway,
  writeProfile,
  writeSession,
  type UsuarioPerfil,
} from "./token-store";

export interface ActualizarPerfilInput {
  nombre: string;
  apellido: string;
}

export interface SessionValue {
  gestor: UsuarioPerfil | null;
  loading: boolean;
  api: GestorApi;
  login(usuario: string, password: string, rol?: RolLogin): Promise<void>;
  logout(): Promise<void>;
  actualizarPerfil(input: ActualizarPerfilInput): Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [gestor, setGestor] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

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

  const login = useCallback(
    async (usuario: string, password: string, rol: RolLogin = "gestor") => {
      const result = await apiLogin(usuario, password, rol);
      const perfilSesion: UsuarioPerfil = rol === "propietario"
        ? {
            id: result.propietario?.id ?? "",
            usuario: result.propietario?.usuario ?? usuario,
            nombre: result.propietario?.nombre ?? "",
            apellido: result.propietario?.apellido ?? "",
            rol,
          }
        : {
            id: result.gestor?.id ?? "",
            usuario: result.gestor?.usuario ?? usuario,
            nombre: result.gestor?.nombre ?? "",
            apellido: result.gestor?.apellido ?? "",
            rol,
          };
      await writeSession(result);
      await writeProfile(perfilSesion);
      setGestor(perfilSesion);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setGestor(null);
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
    () => ({ gestor, loading, api, login, logout, actualizarPerfil }),
    [gestor, loading, api, login, logout, actualizarPerfil],
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