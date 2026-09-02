jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

import { act, renderHook } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { evidenciasParaOffline, useEvidencias } from "./use-evidencias";

const imagePickerMock = ImagePicker as jest.Mocked<typeof ImagePicker>;

describe("useEvidencias", () => {
  beforeEach(() => jest.clearAllMocks());

  it("agrega evidencias seleccionadas de la librería (con base64)", async () => {
    imagePickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({
      granted: true,
    } as never);
    imagePickerMock.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///a.jpg", fileName: "a.jpg", mimeType: "image/jpeg", base64: "AAAA" },
        { uri: "file:///b.png", fileName: null, mimeType: "image/png", base64: "BBBB" },
      ],
    } as never);

    const { result } = await renderHook(() => useEvidencias());

    await act(async () => {
      await result.current.agregarDesdeLibreria();
    });

    expect(result.current.evidencias).toEqual([
      { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", base64: "AAAA" },
      { uri: "file:///b.png", name: expect.any(String), type: "image/png", base64: "BBBB" },
    ]);
    expect(imagePickerMock.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        base64: true,
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