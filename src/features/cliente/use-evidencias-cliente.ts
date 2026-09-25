import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ofrecerAbrirAjustes } from "../permisos/permisos";
import { reducirImagen } from "../evidencias/reducir-imagen";

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
      ofrecerAbrirAjustes(permiso, "Se necesita permiso para acceder a tus fotos.");
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
        const asset = result.assets[0];
        const evidencia = aEvidencia(campo, asset);
        const reducida = await reducirImagen(
          evidencia.uri,
          asset.width ?? 0,
          asset.height ?? 0,
        );
        // El resize siempre produce JPEG: normaliza el tipo y la extensión para
        // que el backend (multer filtra image/jpeg|png|webp) no rechace fuentes
        // HEIC/png convertidas.
        const final = reducida.convertidoAJpeg
          ? {
              ...evidencia,
              uri: reducida.uri,
              type: "image/jpeg",
              name: `${evidencia.name.replace(/\.[^.]+$/, "")}.jpg`,
            }
          : { ...evidencia, uri: reducida.uri };
        setEvidencias((prev) => [
          ...prev.filter((e) => e.campo !== campo),
          final,
        ]);
        return final;
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