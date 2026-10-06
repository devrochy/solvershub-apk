import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import type { ClienteAdmin } from "@core/api/admin";
import type { SqlExecutor } from "./db/executor";
import {
  auditoriaPendiente,
  marcarAuditoriaSincronizada,
  registrarAuditoria,
} from "./repos/auditoria-local";

/**
 * Auditoría de acciones críticas de la app (ADR-0097, HU-APP-16): se registra
 * en local (SQLite) y se sube con idempotencia por `eventId` al backend
 * (`POST /api/v1/audit/mobile-events`, ack por evento).
 */

async function deviceId(): Promise<string | null> {
  try {
    return (await Application.getAndroidId()) || null;
  } catch {
    return null;
  }
}

export async function registrarAccionCritica(
  db: SqlExecutor,
  entrada: {
    accion: string;
    entidad: string;
    entidadId?: string | null;
    payload?: Record<string, unknown>;
    usuario?: string | null;
  },
): Promise<string> {
  const id = Crypto.randomUUID();
  await registrarAuditoria(db, {
    id,
    accion: entrada.accion,
    entidad: entrada.entidad,
    entidadId: entrada.entidadId ?? null,
    payload: JSON.stringify(entrada.payload ?? {}),
    user: entrada.usuario ?? null,
    device: await deviceId(),
    ts: new Date().toISOString(),
  });
  return id;
}

export async function subirAuditoriaPendiente(
  db: SqlExecutor,
  cliente: ClienteAdmin,
): Promise<{ subidos: number; errores: number }> {
  const pendientes = await auditoriaPendiente(db);
  if (pendientes.length === 0) {
    return { subidos: 0, errores: 0 };
  }
  try {
    const respuesta = await cliente.post<{
      eventos: { eventId: string; estado: string; error?: string | null }[];
    }>("/audit/mobile-events", {
      events: pendientes.map((e) => ({
        eventId: e.id,
        accion: e.accion,
        entidad: e.entidad,
        entidadId: e.entidadId,
        payload: JSON.parse(e.payload),
        deviceId: e.device,
        ocurridoEn: e.ts,
      })),
    });
    let subidos = 0;
    for (const ack of respuesta.eventos) {
      // "sincronizado" y "duplicado" cierran el evento local (idempotencia).
      if (ack.estado !== "error") {
        await marcarAuditoriaSincronizada(db, ack.eventId);
        subidos += 1;
      }
    }
    return { subidos, errores: pendientes.length - subidos };
  } catch {
    return { subidos: 0, errores: pendientes.length };
  }
}
