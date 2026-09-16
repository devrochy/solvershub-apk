jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
}));

import * as ImageManipulator from "expo-image-manipulator";
import { reducirImagen } from "./reducir-imagen";

const manipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;

describe("reducirImagen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reduce a máx 1280px del lado mayor y comprime", async () => {
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///reducida.jpg",
      width: 1280,
      height: 960,
    } as never);

    const res = await reducirImagen("file:///foto.jpg", 4000, 3000);

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///foto.jpg",
      [{ resize: { width: 1280, height: 960 } }],
      { compress: 0.7, format: "jpeg" },
    );
    expect(res).toEqual({ uri: "file:///reducida.jpg", base64: null, convertidoAJpeg: true });
  });

  it("no escala si la imagen ya es pequeña, pero comprime", async () => {
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///comprimida.jpg",
      width: 800,
      height: 600,
    } as never);

    await reducirImagen("file:///foto.jpg", 800, 600);

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith("file:///foto.jpg", [], {
      compress: 0.7,
      format: "jpeg",
    });
  });

  it("devuelve base64 cuando se solicita", async () => {
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///reducida.jpg",
      base64: "AAAA",
    } as never);

    const res = await reducirImagen("file:///camara.jpg", 4000, 3000, { base64: true });

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///camara.jpg",
      [{ resize: { width: 1280, height: 960 } }],
      { compress: 0.7, format: "jpeg", base64: true },
    );
    expect(res.base64).toBe("AAAA");
  });

  it("usa la URI original si el resize falla (sin base64)", async () => {
    manipulator.manipulateAsync.mockRejectedValue(new Error("no manipulable"));

    const res = await reducirImagen("file:///foto.heic", 4000, 3000);

    expect(res).toEqual({ uri: "file:///foto.heic", base64: null, convertidoAJpeg: false });
  });
});
