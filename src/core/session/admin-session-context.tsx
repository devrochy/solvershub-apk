import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { secureDelete, secureGet, secureSet } from "@core/secure-kv";
import { apiLoginAdmin, apiMeAdmin } from "@core/api/auth-admin";
import { AdminSesion, CLAVE_SESION_ADMIN, MeAdmin } from "./types";

export interface AdminSessionValue {
  sesion: AdminSesion | null;
  loading: boolean;
  login(identifier: string, password: string): Promise<{ sesion: AdminSesion; me: MeAdmin }>;
  /** Fija el negocio activo de la sesión admin (re-consulta `/admin/me` con X-Tenant-Id). */
  seleccionarNegocio(tenantId: string): Promise<void>;
  logout(): Promise<void>;
}

export const AdminSessionContext = createContext<AdminSessionValue | null>(null);

async function leerSesion(): Promise<AdminSesion | null> {
  const raw = await secureGet(CLAVE_SESION_ADMIN);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AdminSesion;
  } catch {
    return null;
  }
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<AdminSesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    leerSesion()
      .then((s) => {
        if (activo) {
          setSesion(s);
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

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await apiLoginAdmin(identifier, password);
    const me = await apiMeAdmin(result.token);
    const nueva: AdminSesion = {
      token: result.token,
      adminId: result.adminId,
      email: me.email,
      role: me.role,
      tenantId: me.tenant?.id ?? null,
      tenantName: me.tenant?.name ?? null,
      permissions: me.permissions,
    };
    await secureSet(CLAVE_SESION_ADMIN, JSON.stringify(nueva));
    setSesion(nueva);
    return { sesion: nueva, me };
  }, []);

  const seleccionarNegocio = useCallback(
    async (tenantId: string) => {
      if (!sesion) {
        return;
      }
      const me = await apiMeAdmin(sesion.token, tenantId);
      const actualizada: AdminSesion = {
        ...sesion,
        tenantId: me.tenant?.id ?? sesion.tenantId,
        tenantName: me.tenant?.name ?? sesion.tenantName,
        permissions: me.permissions,
      };
      await secureSet(CLAVE_SESION_ADMIN, JSON.stringify(actualizada));
      setSesion(actualizada);
    },
    [sesion],
  );

  const logout = useCallback(async () => {
    await secureDelete(CLAVE_SESION_ADMIN);
    setSesion(null);
  }, []);

  const value = useMemo(
    () => ({ sesion, loading, login, seleccionarNegocio, logout }),
    [sesion, loading, login, seleccionarNegocio, logout],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error("useAdminSession debe usarse dentro de AdminSessionProvider");
  }
  return ctx;
}
