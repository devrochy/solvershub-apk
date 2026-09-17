import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import {
  guardarTrayectoriaActiva,
  leerTrayectoriaActiva,
  limpiarTrayectoriaActiva,
} from "./trayectoria-storage";

export interface PuntoGeo {
  latitud: number;
  longitud: number;
}

export interface UseTrayectoriaResult {
  activa: boolean;
  puntos: PuntoGeo[];
  error: string | null;
  iniciar(): Promise<void>;
  detener(): PuntoGeo[];
}

export function useTrayectoria(): UseTrayectoriaResult {
  const [activa, setActiva] = useState(false);
  const [puntos, setPuntos] = useState<PuntoGeo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const puntosRef = useRef<PuntoGeo[]>([]);
  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);
  const montadoRef = useRef(true);

  async function persistir(activaActual: boolean) {
    // Persiste la trayectoria para no perderla si la app se cierra a mitad de ruta.
    await guardarTrayectoriaActiva({ puntos: puntosRef.current, activa: activaActual });
  }

  async function suscribir() {
    if (suscripcionRef.current) {
      return;
    }
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      setError("Se necesita permiso de ubicación.");
      return;
    }
    setError(null);

    try {
      const suscripcion = await Location.watchPositionAsync(
        { distanceInterval: 20, timeInterval: 15000 },
        (ubicacion) => {
          const punto: PuntoGeo = {
            latitud: ubicacion.coords.latitude,
            longitud: ubicacion.coords.longitude,
          };
          puntosRef.current = [...puntosRef.current, punto];
          setPuntos(puntosRef.current);
          void persistir(true);
        },
      );
      suscripcionRef.current = suscripcion;
      setActiva(true);
      await persistir(true);
    } catch {
      setError("No se pudo acceder a tu ubicación.");
    }
  }

  async function iniciar() {
    if (suscripcionRef.current) {
      return;
    }
    puntosRef.current = [];
    setPuntos([]);
    await suscribir();
  }

  function detener(): PuntoGeo[] {
    suscripcionRef.current?.remove();
    suscripcionRef.current = null;
    setActiva(false);
    void limpiarTrayectoriaActiva();
    return puntosRef.current;
  }

  useEffect(() => {
    montadoRef.current = true;
    leerTrayectoriaActiva()
      .then((trayectoria) => {
        if (!montadoRef.current || !trayectoria) {
          return;
        }
        // Restaura los puntos de una ruta en curso y reanuda el GPS si seguía activo.
        puntosRef.current = trayectoria.puntos;
        setPuntos(trayectoria.puntos);
        if (trayectoria.activa) {
          void suscribir();
        }
      })
      .catch(() => undefined);
    return () => {
      montadoRef.current = false;
      suscripcionRef.current?.remove();
      suscripcionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  return { activa, puntos, error, iniciar, detener };
}
