jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg", PNG: "png" },
}));

import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { evidenciasParaOffline, useEvidencias } from "./use-evidencias";

const imagePickerMock = ImagePicker as jest.Mocked<typeof ImagePicker>;
const manipulator = ImageManipulator as jest.Mocked<typeof ImageManipulator>;

describe("useEvidencias", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redimensiona las evidencias de la librería y usa el base64 reducido", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///a.jpg", fileName: "a.jpg", mimeType: "image/jpeg", width: 4000, height: 3000 },
        { uri: "file:///b.png", fileName: null, mimeType: "image/png", width: 4000, height: 3000 },
      ],
    } as never);
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///reducida.jpg",
      base64: "AAAA",
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeLibreria();
    });

    expect(manipulator.manipulateAsync).toHaveBeenCalledWith(
      "file:///a.jpg",
      [{ resize: { width: 1280, height: 960 } }],
      { compress: 0.7, format: "jpeg", base64: true },
    );
    expect(result.current.evidencias).toEqual([
      { uri: "file:///reducida.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
      { uri: "file:///reducida.jpg", name: expect.any(String), type: "image/jpeg", base64: "AAAA" },
    ]);
    expect(imagePickerMock.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5,
      }),
    );
  });

  it("no agrega nada si no se concede el permiso de librería", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: false,
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeLibreria();
    });

    expect(result.current.evidencias).toEqual([]);
    expect(result.current.error).toBeTruthy();
    expect(imagePickerMock.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("agrega una foto desde la cámara (tipo jpeg)", async () => {
    imagePickerMock.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///foto.heic", fileName: "foto.heic", mimeType: "image/heic", width: 4000, height: 3000 }],
    } as never);
    manipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///reducida.jpg",
      base64: "CCCC",
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeCamara();
    });

    expect(result.current.evidencias).toHaveLength(1);
    expect(result.current.evidencias[0]).toMatchObject({
      uri: "file:///reducida.jpg",
      name: "foto.jpg",
      type: "image/jpeg",
      base64: "CCCC",
    });
  });

  it("si el resize falla, conserva la uri y la base64 originales", async () => {
    imagePickerMock.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///foto.jpg", fileName: "foto.jpg", mimeType: "image/jpeg", base64: "ORIG", width: 4000, height: 3000 }],
    } as never);
    manipulator.manipulateAsync.mockRejectedValue(new Error("no manipulable"));

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeCamara();
    });

    expect(result.current.evidencias[0]).toMatchObject({
      uri: "file:///foto.jpg",
      type: "image/jpeg",
      base64: "ORIG",
    });
  });

  it("quita una evidencia por uri", async () => {
    const { result } = await renderHook(() => useEvidencias());
    await act(async () => {
      result.current.quitar("file:///a.jpg");
    });
    expect(result.current.evidencias).toEqual([]);
  });
});

describe("evidenciasParaOffline", () => {
  it("convierte evidencias a [{nombre, mimetype, base64}]", () => {
    const resultado = evidenciasParaOffline([
      { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
    ]);

    expect(resultado).toEqual([{ nombre: "a.jpg", mimetype: "image/jpeg", base64: "AAAA" }]);
  });

  it("omite evidencias sin base64", () => {
    const resultado = evidenciasParaOffline([
      { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
      { uri: "file:///b.jpg", name: "b.jpg", type: "image/jpeg", base64: null },
    ]);

    expect(resultado).toEqual([{ nombre: "a.jpg", mimetype: "image/jpeg", base64: "AAAA" }]);
  });

  it("devuelve [] cuando no hay evidencias", () => {
    expect(evidenciasParaOffline([])).toEqual([]);
  });
});
