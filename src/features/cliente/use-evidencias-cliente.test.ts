jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
}));

import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useEvidenciasCliente } from "./use-evidencias-cliente";

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const manipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;

function mockFoto(overrides: Record<string, unknown> = {}) {
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchCameraAsync.mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: "file:///camara.jpg",
        fileName: "camara.jpg",
        mimeType: "image/jpeg",
        width: 4000,
        height: 3000,
        ...overrides,
      },
    ],
  } as never);
}

describe("useEvidenciasCliente", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reduce la foto a máx 1280px del lado mayor y comprime", async () => {
    mockFoto();
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///reducida.jpg",
      width: 1280,
      height: 960,
    } as never);

    const { result } = await renderHook(() => useEvidenciasCliente());

    await act(async () => {
      await result.current.agregar("foto_facial", "camara");
    });

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///camara.jpg",
      [{ resize: { width: 1280, height: 960 } }],
      { compress: 0.7, format: "jpeg" },
    );
    expect(result.current.evidencias).toEqual([
      { campo: "foto_facial", uri: "file:///reducida.jpg", name: "camara.jpg", type: "image/jpeg" },
    ]);
  });

  it("no escala si la foto ya es pequeña, pero sí comprime", async () => {
    mockFoto({ width: 800, height: 600 });
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///comprimida.jpg",
      width: 800,
      height: 600,
    } as never);

    const { result } = await renderHook(() => useEvidenciasCliente());

    await act(async () => {
      await result.current.agregar("documento_frente", "camara");
    });

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///camara.jpg",
      [],
      { compress: 0.7, format: "jpeg" },
    );
    expect(result.current.evidencias[0].uri).toBe("file:///comprimida.jpg");
  });

  it("usa la URI original si el resize falla", async () => {
    mockFoto();
    manipulator.manipulateAsync.mockRejectedValue(new Error("no manipulable"));

    const { result } = await renderHook(() => useEvidenciasCliente());

    await act(async () => {
      await result.current.agregar("foto_facial", "camara");
    });

    expect(result.current.evidencias[0].uri).toBe("file:///camara.jpg");
  });

  it("no agrega nada si no se concede el permiso de cámara", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);

    const { result } = await renderHook(() => useEvidenciasCliente());

    await act(async () => {
      await result.current.agregar("foto_facial", "camara");
    });

    expect(result.current.evidencias).toEqual([]);
    expect(manipulator.manipulateAsync).not.toHaveBeenCalled();
  });
});