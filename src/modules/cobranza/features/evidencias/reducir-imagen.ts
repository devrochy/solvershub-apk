import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

const DIMENSION_MAX = 1280;
const COMPRESION = 0.7;

export interface ImagenReducida {
  uri: string;
  base64: string | null;
  convertidoAJpeg: boolean;
}

/**
 * Reduce y comprime una imagen: limita el lado mayor a 1280px y comprime a JPEG
 * quality 0.7. El túnel de pruebas cae con timeouts cuando el multipart es
 * grande; reducidas (~200-500KB) el upload es rápido y la cola offline no crece
 * de más. Si el resize falla, devuelve la URI original (sin base64).
 */
export async function reducirImagen(
  uri: string,
  width: number,
  height: number,
  opciones: { base64?: boolean } = {},
): Promise<ImagenReducida> {
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
    const config: { compress: number; format: SaveFormat; base64?: boolean } = {
      compress: COMPRESION,
      format: SaveFormat.JPEG,
    };
    if (opciones.base64) {
      config.base64 = true;
    }
    const resultado = await manipulateAsync(uri, acciones, config);
    return {
      uri: resultado.uri,
      base64: resultado.base64 ?? null,
      convertidoAJpeg: true,
    };
  } catch {
    return { uri, base64: null, convertidoAJpeg: false };
  }
}
