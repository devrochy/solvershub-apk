import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

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

const DIMENSION_MAX = 1280;
const COMPRESION = 0.7;

/**
 * Reduce y comprime la foto elegida (A6): limita el lado mayor a 1280px y la
 * comprime a JPEG quality 0.7. El túnel de pruebas (cloudflared) cae con
 * timeouts cuando el multipart es grande; con fotos de cámara (~6MB) la
 * creación de cliente no llegaba a completarse. Reducidas (~200-500KB cada
 * una) el upload es rápido. Si el resize falla, devuelve la URI original.
 */
async function reducirImagen(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const ladoMayor = Math.max(width, height);
  const escala = ladoMayor > DIMENSION_MAX ? DIMENSION_MAX / ladoMayor : 1;
  try {
    const acciones =
      escala < 1
        ? [
            {
              resize: {
                width: Math.round(width * escala),
                height: Math.round(height * escala),
              },
            },
          ]
        : [];
    const resultado = await manipulateAsync(uri, acciones, {
      compress: COMPRESION,
      format: SaveFormat.JPEG,
    });
    return resultado.uri;
  } catch {
    return uri;
  }
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
        const asset = result.assets[0];
        const evidencia = aEvidencia(campo, asset);
        const uriReducida = await reducirImagen(
          evidencia.uri,
          asset.width ?? 0,
          asset.height ?? 0,
        );
        const final = { ...evidencia, uri: uriReducida };
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