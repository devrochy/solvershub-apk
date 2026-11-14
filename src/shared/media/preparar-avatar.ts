import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ArchivoAvatar } from "@core/api/perfil-admin";

const LADO_MAX = 512;
const CALIDAD = 0.8;

export interface AssetAvatar {
  uri: string;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
  fileName?: string | null;
}

/** Reduce la foto a 512 px y la normaliza a JPEG (límite del backend: 2 MB). */
export async function prepararAvatar(asset: AssetAvatar): Promise<ArchivoAvatar> {
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
    return { uri: resultado.uri, name: "avatar.jpg", type: "image/jpeg" };
  } catch {
    return {
      uri: asset.uri,
      name: asset.fileName ?? "avatar.jpg",
      type: asset.mimeType ?? "image/jpeg",
    };
  }
}
