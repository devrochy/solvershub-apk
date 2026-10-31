import { apiV1 } from "@core/config";
import type { AdminSesion, MeAdmin } from "@core/session/types";
import { parseError } from "./auth-admin";
import { construirMultipart } from "./multipart";
import { fetchApi } from "./http";

/** Cambios editables del perfil propio (`PATCH /admin/me`). */
export interface PerfilUpdate {
  nombre: string;
  telefono: string;
  username: string;
}

/** Contraseña propia (`POST /admin/me/password`). */
export interface PasswordUpdate {
  actual: string;
  nueva: string;
}

/** Archivo de avatar ya preparado (JPEG reducido). */
export interface ArchivoAvatar {
  uri: string;
  name: string;
  type: string;
}

function cabeceras(sesion: AdminSesion): Record<string, string> {
  const headers: Record<string, string> = { Authorization: `Bearer ${sesion.token}` };
  if (sesion.tenantId) {
    headers["X-Tenant-Id"] = sesion.tenantId;
  }
  return headers;
}

async function leerMe(res: Response): Promise<MeAdmin> {
  if (!res.ok) {
    throw await parseError(res);
  }
  return (await res.json()) as MeAdmin;
}

/** Perfil propio actualizado (`GET /admin/me`). */
export async function apiLeerPerfilAdmin(sesion: AdminSesion): Promise<MeAdmin> {
  const res = await fetchApi(apiV1("/admin/me"), { headers: cabeceras(sesion) });
  return leerMe(res);
}

/** Guarda nombre, teléfono y usuario (`PATCH /admin/me`). */
export async function apiGuardarPerfilAdmin(
  sesion: AdminSesion,
  cambios: PerfilUpdate,
): Promise<MeAdmin> {
  const res = await fetchApi(apiV1("/admin/me"), {
    method: "PATCH",
    headers: { ...cabeceras(sesion), "Content-Type": "application/json" },
    body: JSON.stringify(cambios),
  });
  return leerMe(res);
}

/** Cambia la contraseña propia validando la actual (`POST /admin/me/password`). */
export async function apiCambiarPasswordAdmin(
  sesion: AdminSesion,
  cambio: PasswordUpdate,
): Promise<void> {
  const res = await fetchApi(apiV1("/admin/me/password"), {
    method: "POST",
    headers: { ...cabeceras(sesion), "Content-Type": "application/json" },
    body: JSON.stringify(cambio),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
}

/** Sube o reemplaza la foto de perfil (`POST /admin/me/avatar`). */
export async function apiSubirAvatarAdmin(
  sesion: AdminSesion,
  archivo: ArchivoAvatar,
): Promise<MeAdmin> {
  const { body, boundary } = await construirMultipart({}, [{ campo: "file", ...archivo }]);
  const res = await fetchApi(apiV1("/admin/me/avatar"), {
    method: "POST",
    headers: {
      ...cabeceras(sesion),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: body as unknown as BodyInit,
  });
  return leerMe(res);
}

/** Quita la foto de perfil (`DELETE /admin/me/avatar`). */
export async function apiQuitarAvatarAdmin(sesion: AdminSesion): Promise<void> {
  const res = await fetchApi(apiV1("/admin/me/avatar"), {
    method: "DELETE",
    headers: cabeceras(sesion),
  });
  if (!res.ok) {
    throw await parseError(res);
  }
}
