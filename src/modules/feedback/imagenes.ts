import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";

export type AssetElegido = Pick<ImagePickerAsset, "uri" | "width" | "height" | "mimeType" | "fileName" | "fileSize">;

export interface ImagenPreparada {
  uri: string;
  name: string;
  type: string;
  bytes: number;
}

/** Pasadas de compresión: una captura de pantalla se lee bien a 1920 px; si aún pesa, se baja más. */
const PASADAS = [
  { lado: 1920, calidad: 0.8 },
  { lado: 1280, calidad: 0.6 },
];

export class ImagenMuyGrande extends Error {
  constructor() {
    super("La imagen pesa demasiado incluso comprimida.");
    this.name = "ImagenMuyGrande";
  }
}

function tamanoDe(uri: string): number {
  try {
    return new File(uri).size ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Reduce y normaliza a JPEG una imagen del picker (HU-FB-07). Se comprime siempre: el cuerpo
 * multipart se arma en memoria y por datos móviles cada MB cuenta. Lanza `ImagenMuyGrande` si
 * ni la segunda pasada baja de `maxBytes`.
 */
export async function prepararImagen(asset: AssetElegido, indice: number, maxBytes: number): Promise<ImagenPreparada> {
  const ancho = asset.width ?? 0;
  const alto = asset.height ?? 0;
  const ladoMayor = Math.max(ancho, alto);
  const nombre = `captura-${indice + 1}.jpg`;
  for (const { lado, calidad } of PASADAS) {
    const escala = ancho > 0 && alto > 0 && ladoMayor > lado ? lado / ladoMayor : 1;
    try {
      const resultado = await manipulateAsync(
        asset.uri,
        escala < 1 ? [{ resize: { width: Math.round(ancho * escala), height: Math.round(alto * escala) } }] : [],
        { compress: calidad, format: SaveFormat.JPEG },
      );
      const bytes = tamanoDe(resultado.uri);
      if (bytes > 0 && bytes <= maxBytes) {
        return { uri: resultado.uri, name: nombre, type: "image/jpeg", bytes };
      }
    } catch {
      break;
    }
  }
  // Sin manipulador (o falló): se manda la original si cabe; el backend valida tipo y firma.
  const bytes = asset.fileSize ?? tamanoDe(asset.uri);
  if (bytes > 0 && bytes <= maxBytes) {
    return { uri: asset.uri, name: asset.fileName ?? nombre, type: asset.mimeType ?? "image/jpeg", bytes };
  }
  throw new ImagenMuyGrande();
}

/** Las imágenes del borrador que siguen en disco (la caché del sistema pudo limpiarse). */
export function imagenesQueExisten(imagenes: ImagenPreparada[]): ImagenPreparada[] {
  return imagenes.filter((imagen) => {
    try {
      return new File(imagen.uri).exists;
    } catch {
      return false;
    }
  });
}
