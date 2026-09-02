import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

export interface EvidenciaSeleccionada {
  uri: string;
  name: string;
  type: string;
  base64: string | null;
}

export const MAX_EVIDENCIAS = 5;

function aEvidencia(asset: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
}): EvidenciaSeleccionada {
  const type = asset.mimeType ?? "image/jpeg";
  const ext = type.split("/")[1] ?? "jpg";
  return {
    uri: asset.uri,
    name: asset.fileName ?? `evidencia-${Date.now()}.${ext}`,
    type,
    base64: asset.base64 ?? null,
  };
}

/**
 * Convierte las evidencias seleccionadas al payload que espera el backend para
 * el evento offline `gasto` (`EvidenciasOfflineInput[]`): {nombre, mimetype,
 * base64}. Omite las que no tienen base64 (no capturadas).
 */
export function evidenciasParaOffline(
  evidencias: EvidenciaSeleccionada[],
): Array<{ nombre: string; mimetype: string; base64: string }> {
  return evidencias
    .filter((e) => e.base64 != null)
    .map((e) => ({ nombre: e.name, mimetype: e.type, base64: e.base64 as string }));
}

export interface UseEvidenciasResult {
  evidencias: EvidenciaSeleccionada[];
  cargando: boolean;
  error: string | null;
  agregarDesdeLibreria(): Promise<void>;
  agregarDesdeCamara(): Promise<void>;
  quitar(uri: string): void;
  resetError(): void;
}

export function useEvidencias(): UseEvidenciasResult {
  const [evidencias, setEvidencias] = useState<EvidenciaSeleccionada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregarDesdeLibreria() {
    if (evidencias.length >= MAX_EVIDENCIAS) {
      return;
    }
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError("Se necesita permiso para acceder a tus fotos.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_EVIDENCIAS - evidencias.length,
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled) {
        const nuevas = result.assets.map(aEvidencia);
        setEvidencias((actual) =>
          [...actual, ...nuevas].slice(0, MAX_EVIDENCIAS),
        );
      }
    } catch {
      setError("No se pudieron cargar las fotos.");
    } finally {
      setCargando(false);
    }
  }

  async function agregarDesdeCamara() {
    if (evidencias.length >= MAX_EVIDENCIAS) {
      return;
    }
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      setError("Se necesita permiso para usar la cámara.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        setEvidencias((actual) =>
          [...actual, aEvidencia(result.assets[0])].slice(0, MAX_EVIDENCIAS),
        );
      }
    } catch {
      setError("No se pudo tomar la foto.");
    } finally {
      setCargando(false);
    }
  }

  function quitar(uri: string) {
    setEvidencias((actual) => actual.filter((e) => e.uri !== uri));
  }

  return {
    evidencias,
    cargando,
    error,
    agregarDesdeLibreria,
    agregarDesdeCamara,
    quitar,
    resetError: () => setError(null),
  };
}