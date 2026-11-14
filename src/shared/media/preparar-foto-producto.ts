import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { AssetAvatar } from "./preparar-avatar";

/** Lado mayor de la foto de un producto: la IA necesita ver la etiqueta y el precio, el backend acepta hasta 5 MB. */
const LADO_MAX = 1280;
const CALIDAD = 0.8;

export interface ArchivoDeFoto {
  uri: string;
  name: string;
  type: string;
}

/** Reduce la foto de un producto a 1280 px y la normaliza a JPEG (SPEC-45: una foto, un producto). */
export async function prepararFotoDeProducto(asset: AssetAvatar, indice = 0): Promise<ArchivoDeFoto> {
  const ancho = asset.width ?? 0;
  const alto = asset.height ?? 0;
  const ladoMayor = Math.max(ancho, alto);
  const escala = ancho > 0 && alto > 0 && ladoMayor > LADO_MAX ? LADO_MAX / ladoMayor : 1;
  try {
    const resultado = await manipulateAsync(
      asset.uri,
      escala < 1
        ? [{ resize: { width: Math.round(ancho * escala), height: Math.round(alto * escala) } }]
        : [],
      { compress: CALIDAD, format: SaveFormat.JPEG },
    );
    return { uri: resultado.uri, name: `producto-${indice + 1}.jpg`, type: "image/jpeg" };
  } catch {
    return {
      uri: asset.uri,
      name: asset.fileName ?? `producto-${indice + 1}.jpg`,
      type: asset.mimeType ?? "image/jpeg",
    };
  }
}
