import { useEffect, useState } from "react";
import { listarCola, type EventoOffline } from "./cola";

/**
 * Pagos registrados sin conexión que siguen en la cola (HU-DS-10): la ficha del
 * cliente los marca con el badge "Pendiente" hasta que llega el ack. Es solo
 * lectura de la cola que ya existe (ADR-APP-04): no encola, no borra ni cambia
 * cómo se sincroniza.
 */
export interface PagosPendientes {
  /** Cuotas con un pago de cuota en la cola. */
  cuotas: ReadonlySet<string>;
  /** Préstamos con un pago o abono en la cola. */
  prestamos: ReadonlySet<string>;
}

export const SIN_PAGOS_PENDIENTES: PagosPendientes = { cuotas: new Set(), prestamos: new Set() };

/** Pagos (cuota o abono) del cliente que esperan sincronizarse. */
export function pagosPendientesDeCliente(eventos: EventoOffline[], clienteId: string): PagosPendientes {
  const cuotas = new Set<string>();
  const prestamos = new Set<string>();
  for (const evento of eventos) {
    const p = evento.payload;
    if (evento.tipoEvento !== "visita" || p.resultado !== "pago" || String(p.clienteId) !== String(clienteId)) {
      continue;
    }
    if (p.prestamoId != null) prestamos.add(String(p.prestamoId));
    if (p.cuotaId != null) cuotas.add(String(p.cuotaId));
  }
  return { cuotas, prestamos };
}

/**
 * Lee la cola cuando cambia el contador de pendientes (`sinSubir` del
 * OfflineContext): al encolar un pago aparece y al llegar el ack se va.
 */
export function usePagosPendientes(clienteId: string, sinSubir: number): PagosPendientes {
  const [pendientes, setPendientes] = useState<PagosPendientes>(SIN_PAGOS_PENDIENTES);
  useEffect(() => {
    let vivo = true;
    if (sinSubir === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sin cola no hay nada que leer
      setPendientes(SIN_PAGOS_PENDIENTES);
      return undefined;
    }
    listarCola()
      .then((eventos) => {
        if (vivo) setPendientes(pagosPendientesDeCliente(eventos, clienteId));
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [clienteId, sinSubir]);
  return pendientes;
}
