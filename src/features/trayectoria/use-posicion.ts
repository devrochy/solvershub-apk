import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import type { GestorApi } from "../../api/gestor";

const INTERVALO_MS = 30000;

/**
 * Envía la posición GPS del gestor periódicamente mientras la trayectoria está
 * activa. REQ-APK-013: el permiso se pide **una sola vez** por sesión y el
 * polling se **pausa en background** (batería) reanudándose al volver.
 */
export function usePosicion(
  api: GestorApi,
  carteraId: string,
  activa: boolean,
  detenerEnviada: number,
): void {
  const permisoRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!carteraId || !activa) {
      return;
    }
    let intervalo: ReturnType<typeof setInterval> | null = null;

    async function enviarPosicion() {
      try {
        const estado = AppState.currentState;
        if (estado === "background" || estado === "inactive") {
          return;
        }
        if (permisoRef.current === null) {
          const permiso = await Location.requestForegroundPermissionsAsync();
          permisoRef.current = permiso.granted;
        }
        if (!permisoRef.current) {
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

    function arrancar() {
      if (intervalo === null) {
        void enviarPosicion();
        intervalo = setInterval(() => {
          void enviarPosicion();
        }, INTERVALO_MS);
      }
    }

    function detener() {
      if (intervalo !== null) {
        clearInterval(intervalo);
        intervalo = null;
      }
    }

    arrancar();
    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active") {
        arrancar();
      } else {
        detener();
      }
    });

    return () => {
      detener();
      suscripcion.remove();
    };
  }, [api, carteraId, activa, detenerEnviada]);
}
