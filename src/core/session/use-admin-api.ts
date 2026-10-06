import { useMemo } from "react";
import { crearClienteAdmin, type ClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "./admin-session-context";

/** Cliente `/api/v1` atado a la sesión admin actual (se renueva al cambiar). */
export function useAdminApi(): ClienteAdmin {
  const { sesion } = useAdminSession();
  return useMemo(() => crearClienteAdmin(sesion), [sesion]);
}
