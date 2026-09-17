import { useEffect } from "react";
import * as Location from "expo-location";
import type { GestorApi } from "../../api/gestor";

const INTERVALO_MS = 30000;

/**
 * A7: envía la posición GPS del gestor periódicamente (polling) mientras la
 * trayectoria está activa. Al detenerse, deja de enviar (el efecto limpia el
 * intervalo). Los errores se ignoran: el siguiente tick reintenta.
 */
export function usePosicion(
  api: GestorApi,
  carteraId: number,
  activa: boolean,
  detenerEnviada: number,
): void {
  useEffect(() => {
    if (!carteraId || !activa) {
      return;
    }

    async function enviarPosicion() {
      try {
        const permiso = await Location.requestForegroundPermissionsAsync();
        if (!permiso.granted) {
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        await api.registrarPosicion(carteraId, {
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
        });
      } catch {
        // Se ignora: el próximo tick reintentará (polling no crítico).
      }
    }

    void enviarPosicion();
    const intervalo = setInterval(() => {
      void enviarPosicion();
    }, INTERVALO_MS);

    return () => {
      clearInterval(intervalo);
    };
  }, [api, carteraId, activa, detenerEnviada]);
}