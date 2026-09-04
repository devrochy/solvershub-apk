import { useState } from "react";
import * as ImagePicker from "expo-image-picker";

export type CampoEvidenciaCliente =
  | "foto_facial"
  | "documento_frente"
  | "documento_reverso";

export interface EvidenciaClienteSeleccionada {
  campo: CampoEvidenciaCliente;
  uri: string;
  name: string;
  type: string;
}

function aEvidencia(
  campo: CampoEvidenciaCliente,
  asset: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
  },
): EvidenciaClienteSeleccionada {
  const type = asset.mimeType ?? "image/jpeg";
  const ext = type.split("/")[1] ?? "jpg";
  return {
    campo,
    uri: asset.uri,
    name: asset.fileName ?? `cliente-${campo}-${Date.now()}.${ext}`,
    type,
  };
}

export type FuenteEvidencia = "libreria" | "camara";

export interface UseEvidenciasClienteResult {
  evidencias: EvidenciaClienteSeleccionada[];
  cargando: boolean;
  error: string | null;
  agregar(
    campo: CampoEvidenciaCliente,
    fuente?: FuenteEvidencia,
  ): Promise<EvidenciaClienteSeleccionada | null>;
  quitar(campo: CampoEvidenciaCliente): void;
  resetError(): void;
}

/**
 * Hook de evidencias del cliente (A5): permite elegir una foto facial, el
 * frente y el reverso del documento desde la galería o cámara. Reutiliza
 * expo-image-picker.
 */
export function useEvidenciasCliente(): UseEvidenciasClienteResult {
  const [evidencias, setEvidencias] = useState<EvidenciaClienteSeleccionada[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregar(
    campo: CampoEvidenciaCliente,
    fuente: FuenteEvidencia = "libreria",
  ): Promise<EvidenciaClienteSeleccionada | null> {
    const permiso =
      fuente === "camara"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      setError("Se necesita permiso para acceder a tus fotos.");
      return null;
    }
    setCargando(true);
    setError(null);
    try {
      const result =
        fuente === "camara"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.6,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.6,
            });
      if (!result.canceled && result.assets[0]) {
        const evidencia = aEvidencia(campo, result.assets[0]);
        setEvidencias((prev) => [
          ...prev.filter((e) => e.campo !== campo),
          evidencia,
        ]);
        return evidencia;
      }
      return null;
    } catch {
      setError("No se pudo seleccionar la imagen.");
      return null;
    } finally {
      setCargando(false);
    }
  }

  function quitar(campo: CampoEvidenciaCliente) {
    setEvidencias((prev) => prev.filter((e) => e.campo !== campo));
  }

  return { evidencias, cargando, error, agregar, quitar, resetError: () => setError(null) };
}