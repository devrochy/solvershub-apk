import { apiV1 } from "@core/config";

/**
 * Cliente de registro de dispositivos de push (ADR-0095, HU-APP-05).
 * Contrato: `POST/DELETE /api/v1/me/push-token` del backend (core/api/routers/push.py).
 */

export async function registrarPushToken(
  adminToken: string,
  tenantId: string,
  expoToken: string,
  platform: "android" | "ios",
): Promise<void> {
  const res = await fetch(apiV1("/me/push-token"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "X-Tenant-Id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: expoToken, platform }),
  });
  if (!res.ok) {
    throw new Error(`push-token registro falló: ${res.status}`);
  }
}

export async function darDeBajaPushToken(
  adminToken: string,
  tenantId: string,
  expoToken: string,
): Promise<void> {
  const res = await fetch(apiV1("/me/push-token"), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "X-Tenant-Id": tenantId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: expoToken, platform: "android" }),
  });
  if (!res.ok) {
    throw new Error(`push-token baja falló: ${res.status}`);
  }
}
