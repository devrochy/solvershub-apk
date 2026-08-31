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
import { apiLogin } from "../api/auth";
import {
  clearSession,
  readProfile,
  sessionGateway,
  writeProfile,
  writeSession,
  type CobradorPerfil,
} from "./token-store";

export interface SessionValue {
  cobrador: CobradorPerfil | null;
  loading: boolean;
  api: CobradorApi;
  login(usuario: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

export const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [cobrador, setCobrador] = useState<CobradorPerfil | null>(null);
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

  const login = useCallback(async (usuario: string, password: string) => {
    const result = await apiLogin(usuario, password);
    await writeSession(result);
    await writeProfile(result.cobrador);
    setCobrador(result.cobrador);
  }, []);

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