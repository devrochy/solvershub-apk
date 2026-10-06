import { File } from "expo-file-system";

export interface ArchivoMultipart {
  campo: string;
  uri: string;
  name: string;
  type: string;
}

export interface MultipartListo {
  body: Uint8Array;
  boundary: string;
}

/**
 * Construye el cuerpo multipart/form-data a mano (Expo SDK 57 usa el fetch de
 * Winter, que rechaza las partes `{ uri, name, type }` de React Native con
 * "Unsupported FormDataPart implementation"). Se arma cada parte con su
 * Content-Disposition/Content-Type explícitos — el backend (multer) filtra por
 * mimetype image/jpeg|png|webp — y se lee el archivo con expo-file-system.
 */
export async function construirMultipart(
  campos: Record<string, string>,
  archivos: ArchivoMultipart[],
): Promise<MultipartListo> {
  const boundary = `----CobraIAMultipart${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const encoder = new TextEncoder();
  const partes: Uint8Array[] = [];
  const push = (texto: string) => partes.push(encoder.encode(texto));
  const CRLF = "\r\n";

  for (const [nombre, valor] of Object.entries(campos)) {
    push(`--${boundary}${CRLF}`);
    push(`Content-Disposition: form-data; name="${nombre}"${CRLF}${CRLF}`);
    push(`${valor}${CRLF}`);
  }
  for (const archivo of archivos) {
    push(`--${boundary}${CRLF}`);
    push(
      `Content-Disposition: form-data; name="${archivo.campo}"; filename="${archivo.name}"${CRLF}`,
    );
    push(`Content-Type: ${archivo.type}${CRLF}${CRLF}`);
    partes.push(await leerBytes(archivo.uri));
    push(CRLF);
  }
  push(`--${boundary}--${CRLF}`);

  const total = partes.reduce((n, parte) => n + parte.byteLength, 0);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    body.set(parte, offset);
    offset += parte.byteLength;
  }
  return { body, boundary };
}

async function leerBytes(uri: string): Promise<Uint8Array> {
  const archivo = new File(uri);
  return archivo.bytes();
}