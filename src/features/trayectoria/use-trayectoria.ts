import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

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

  async function iniciar() {
    if (suscripcionRef.current) {
      return;
    }
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      setError("Se necesita permiso de ubicación.");
      return;
    }
    setError(null);
    puntosRef.current = [];
    setPuntos([]);

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
        },
      );
      suscripcionRef.current = suscripcion;
      setActiva(true);
    } catch {
      setError("No se pudo acceder a tu ubicación.");
    }
  }

  function detener(): PuntoGeo[] {
    suscripcionRef.current?.remove();
    suscripcionRef.current = null;
    setActiva(false);
    return puntosRef.current;
  }

  useEffect(() => {
    return () => {
      suscripcionRef.current?.remove();
      suscripcionRef.current = null;
    };
  }, []);

  return { activa, puntos, error, iniciar, detener };
}