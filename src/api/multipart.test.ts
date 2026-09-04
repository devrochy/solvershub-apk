jest.mock("expo-file-system", () => ({
  File: jest.fn(),
}));

import { File } from "expo-file-system";
import { construirMultipart } from "./multipart";

const FileMock = File as jest.Mocked<typeof File>;

function archivo(uri: string) {
  (FileMock as unknown as jest.Mock).mockImplementationOnce(() => ({
    bytes: () => Promise.resolve(new Uint8Array([1, 2, 3, 4])),
  }));
  return { campo: "foto_facial", uri, name: "foto.jpg", type: "image/jpeg" };
}

const decodificar = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("construirMultipart", () => {
  beforeEach(() => jest.clearAllMocks());

  it("incluye los campos de texto, las cabeceras de archivo y los bytes", async () => {
    const { body, boundary } = await construirMultipart(
      { nombre: "Ana", apellido: "Ríos" },
      [archivo("file:///a.jpg")],
    );
    const texto = decodificar(body);

    expect(texto).toContain(`name="nombre"`);
    expect(texto).toContain("Ana");
    expect(texto).toContain(`name="apellido"`);
    expect(texto).toContain("Ríos");
    expect(texto).toContain(`name="foto_facial"; filename="foto.jpg"`);
    expect(texto).toContain("Content-Type: image/jpeg");
    expect(texto).toContain(`--${boundary}--`);
    // Los bytes 1..4 del archivo viajan en el body.
    const conBytes = Array.from(body).findIndex((_, i) =>
      [body[i], body[i + 1], body[i + 2], body[i + 3]].every((v, j) => v === j + 1),
    );
    expect(conBytes).toBeGreaterThanOrEqual(0);
    expect(FileMock).toHaveBeenCalledWith("file:///a.jpg");
  });

  it("soporta varios archivos con el mismo campo", async () => {
    const { body } = await construirMultipart({}, [
      archivo("file:///a.jpg"),
      archivo("file:///b.jpg"),
    ]);
    const texto = decodificar(body);
    const apariciones = texto.split('name="foto_facial"; filename="').length - 1;
    expect(apariciones).toBe(2);
  });
});