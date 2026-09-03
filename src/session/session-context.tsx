import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cobradorApi, CobradorApi } from "../api/cobrador";
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

export interface SessionValue {
  cobrador: UsuarioPerfil | null;
  loading: boolean;
  api: CobradorApi;
  login(usuario: string, password: string, rol?: RolLogin): Promise<void>;
  logout(): Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [cobrador, setCobrador] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    readProfile()
      .then((perfil) => {
        if (activo) {
          setCobrador(perfil);
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

  const api = useMemo(() => cobradorApi(new ApiClient(sessionGateway)), []);

  const login = useCallback(
    async (usuario: string, password: string, rol: RolLogin = "cobrador") => {
      const result = await apiLogin(usuario, password, rol);
      const perfilSesion: UsuarioPerfil = rol === "socio"
        ? {
            id: result.socio?.id ?? 0,
            usuario: result.socio?.usuario ?? usuario,
            nombre: result.socio?.nombre ?? "",
            apellido: result.socio?.apellido ?? "",
            rol,
          }
        : {
            id: result.cobrador?.id ?? 0,
            usuario: result.cobrador?.usuario ?? usuario,
            nombre: result.cobrador?.nombre ?? "",
            apellido: result.cobrador?.apellido ?? "",
            rol,
          };
      await writeSession(result);
      await writeProfile(perfilSesion);
      setCobrador(perfilSesion);
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearSession();
    setCobrador(null);
  }, []);

  const value = useMemo(
    () => ({ cobrador, loading, api, login, logout }),
    [cobrador, loading, api, login, logout],
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