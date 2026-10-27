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
import { secureDelete, secureGet, secureSet } from "@core/secure-kv";
import { apiLoginAdmin, apiMeAdmin } from "@core/api/auth-admin";
import { apiLeerPerfilAdmin } from "@core/api/perfil-admin";
import {
  AdminSesion,
  CLAVE_SESION_ADMIN,
  MeAdmin,
  normalizarPerfil,
  perfilDeSesion,
  type PerfilAdmin,
} from "./types";

export interface AdminSessionValue {
  sesion: AdminSesion | null;
  loading: boolean;
  /** Perfil visible (nombre, usuario, teléfono y avatar) para la tarjeta y la pantalla. */
  perfil: PerfilAdmin | null;
  login(identifier: string, password: string): Promise<{ sesion: AdminSesion; me: MeAdmin }>;
  /** Fija el negocio activo de la sesión admin (re-consulta `/admin/me` con X-Tenant-Id). */
  seleccionarNegocio(tenantId: string): Promise<void>;
  /** Vuelve a leer `/admin/me` (avatar firmado y datos frescos) y actualiza la sesión. */
  refrescarPerfil(): Promise<PerfilAdmin | null>;
  /** Aplica la respuesta de `/admin/me` tras guardar el perfil o la foto. */
  aplicarPerfil(me: MeAdmin): Promise<PerfilAdmin>;
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
  const [perfil, setPerfil] = useState<PerfilAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  // Ref con la sesión vigente: mantiene estables refrescarPerfil/aplicarPerfil
  // aunque la sesión cambie (si dependieran de `sesion`, un refresco se
  // retroalimentaría al aplicarse y volvería a pedir el perfil en bucle).
  const sesionRef = useRef<AdminSesion | null>(null);

  const guardarSesion = useCallback((siguiente: AdminSesion | null) => {
    sesionRef.current = siguiente;
    setSesion(siguiente);
  }, []);

  useEffect(() => {
    let activo = true;
    leerSesion()
      .then((s) => {
        if (activo) {
          guardarSesion(s);
          setPerfil(s ? perfilDeSesion(s) : null);
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
  }, [guardarSesion]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await apiLoginAdmin(identifier, password);
    const me = await apiMeAdmin(result.token);
    const nueva: AdminSesion = {
      token: result.token,
      adminId: result.adminId,
      email: me.email,
      nombre: me.nombre ?? null,
      username: me.username,
      telefono: me.telefono ?? null,
      avatarUrl: me.avatar_url ?? null,
      role: me.role,
      tenantId: me.tenant?.id ?? null,
      tenantName: me.tenant?.name ?? null,
      permissions: me.permissions,
    };
    await secureSet(CLAVE_SESION_ADMIN, JSON.stringify(nueva));
    guardarSesion(nueva);
    setPerfil(normalizarPerfil(me));
    return { sesion: nueva, me };
  }, [guardarSesion]);

  const seleccionarNegocio = useCallback(
    async (tenantId: string) => {
      const actual = sesionRef.current;
      if (!actual) {
        return;
      }
      const me = await apiMeAdmin(actual.token, tenantId);
      const actualizada: AdminSesion = {
        ...actual,
        email: me.email,
        nombre: me.nombre ?? actual.nombre,
        username: me.username,
        telefono: me.telefono ?? actual.telefono,
        avatarUrl: me.avatar_url ?? actual.avatarUrl,
        role: me.role,
        tenantId: me.tenant?.id ?? actual.tenantId,
        tenantName: me.tenant?.name ?? actual.tenantName,
        permissions: me.permissions,
      };
      await secureSet(CLAVE_SESION_ADMIN, JSON.stringify(actualizada));
      guardarSesion(actualizada);
      setPerfil(normalizarPerfil(me));
    },
    [guardarSesion],
  );

  const aplicarPerfil = useCallback(
    async (me: MeAdmin): Promise<PerfilAdmin> => {
      const siguientePerfil = normalizarPerfil(me);
      setPerfil(siguientePerfil);
      const actual = sesionRef.current;
      if (!actual) {
        return siguientePerfil;
      }
      const actualizada: AdminSesion = {
        ...actual,
        email: siguientePerfil.email,
        nombre: siguientePerfil.nombre,
        username: siguientePerfil.username,
        telefono: siguientePerfil.telefono,
        avatarUrl: siguientePerfil.avatarUrl,
        role: siguientePerfil.role,
        tenantId: me.tenant?.id ?? actual.tenantId,
        tenantName: siguientePerfil.tenantName ?? actual.tenantName,
        permissions: me.permissions,
      };
      await secureSet(CLAVE_SESION_ADMIN, JSON.stringify(actualizada));
      guardarSesion(actualizada);
      return siguientePerfil;
    },
    [guardarSesion],
  );

  const refrescarPerfil = useCallback(async (): Promise<PerfilAdmin | null> => {
    const actual = sesionRef.current;
    if (!actual) {
      return null;
    }
    return aplicarPerfil(await apiLeerPerfilAdmin(actual));
  }, [aplicarPerfil]);

  const logout = useCallback(async () => {
    await secureDelete(CLAVE_SESION_ADMIN);
    guardarSesion(null);
    setPerfil(null);
  }, [guardarSesion]);

  const value = useMemo(
    () => ({ sesion, loading, perfil, login, seleccionarNegocio, refrescarPerfil, aplicarPerfil, logout }),
    [sesion, loading, perfil, login, seleccionarNegocio, refrescarPerfil, aplicarPerfil, logout],
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
