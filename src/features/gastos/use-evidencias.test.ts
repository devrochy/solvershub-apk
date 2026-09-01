jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { useEvidencias } from "./use-evidencias";

const imagePickerMock = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe("useEvidencias", () => {
  beforeEach(() => jest.clearAllMocks());

  it("agrega evidencias seleccionadas de la librería", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///a.jpg", fileName: "a.jpg", mimeType: "image/jpeg" },
        { uri: "file:///b.png", fileName: null, mimeType: "image/png" },
      ],
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeLibreria();
    });

    expect(result.current.evidencias).toEqual([
      { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg" },
      { uri: "file:///b.png", name: expect.any(String), type: "image/png" },
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

  it("agrega una foto desde la cámara", async () => {
    imagePickerMock.requestCameraPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchCameraAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: "file:///foto.jpg", fileName: "foto.jpg", mimeType: null }],
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeCamara();
    });

    expect(result.current.evidencias).toHaveLength(1);
    expect(result.current.evidencias[0].type).toBe("image/jpeg");
  });

  it("quita una evidencia por uri", async () => {
    const { result } = await renderHook(() => useEvidencias());
    await act(async () => {
      result.current.quitar("file:///a.jpg");
    });
    expect(result.current.evidencias).toEqual([]);
  });
});