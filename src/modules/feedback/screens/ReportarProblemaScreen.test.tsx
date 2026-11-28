const mockSesion = { token: "t", adminId: "a-1", email: "a@x.test", role: "admin", tenantId: "t-1", tenantName: "N", permissions: {} };
jest.mock("@core/session/admin-session-context", () => ({ useAdminSession: () => ({ sesion: mockSesion }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
let mockUuid = 0;
jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => `uuid-${++mockUuid}-abcdef`) }));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));
jest.mock("../imagenes", () => ({
  ...jest.requireActual("../imagenes"),
  prepararImagen: jest.fn(async (a: { uri: string }, i: number) => ({ uri: a.uri, name: `captura-${i + 1}.jpg`, type: "image/jpeg", bytes: 1000 })),
  imagenesQueExisten: (imagenes: unknown[]) => imagenes,
}));
jest.mock("../catalogo", () => {
  const { CATALOGO } = jest.requireActual("../testing/fixtures");
  return { ...jest.requireActual("../catalogo"), useCatalogoFeedback: () => ({ estado: "listo", catalogo: CATALOGO }) };
});
jest.mock("../api", () => ({ ...jest.requireActual("../api"), enviarReporte: jest.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { AdminApiError } from "@core/api/admin";
import { enviarReporte } from "../api";
import { claveDelBorrador } from "../borrador";
import { reporte } from "../testing/fixtures";
import { ReportarProblemaScreen } from "./ReportarProblemaScreen";

const enviarMock = enviarReporte as jest.MockedFunction<typeof enviarReporte>;
const CLAVE = claveDelBorrador("t-1", "a-1");

async function abrirYLlenar() {
  await render(<ReportarProblemaScreen onBack={jest.fn()} onVerMisReportes={jest.fn()} />);
  await screen.findByTestId("reportar-scroll");
  await fireEvent.press(screen.getByTestId("reportar-tipo-error"));
  await fireEvent.press(screen.getByTestId("reportar-area-agenda"));
  await fireEvent.changeText(screen.getByTestId("reportar-titulo"), "No carga la agenda");
  await fireEvent.changeText(screen.getByTestId("reportar-descripcion"), "La agenda del martes no carga nunca.");
}

beforeEach(async () => {
  await AsyncStorage.clear();
  enviarMock.mockReset();
  mockUuid = 0;
});

describe("ReportarProblemaScreen (HU-FB-07)", () => {
  it("valida antes de enviar", async () => {
    await render(<ReportarProblemaScreen onBack={jest.fn()} onVerMisReportes={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId("reportar-enviar"));
    expect(await screen.findByText("Elige si es un error, una mejora o una idea.")).toBeTruthy();
    expect(screen.getByText("El título debe tener entre 3 y 120 caracteres.")).toBeTruthy();
    expect(enviarMock).not.toHaveBeenCalled();
  });

  it("si la red se corta, el reintento usa la MISMA clave y al confirmar se borra el borrador", async () => {
    enviarMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    enviarMock.mockResolvedValueOnce({ reporte: reporte(), replay: true });
    await abrirYLlenar();

    await fireEvent.press(screen.getByTestId("reportar-enviar"));
    expect(await screen.findByTestId("reportar-pendiente")).toBeTruthy();
    expect(screen.getByText("Reintentar envío")).toBeTruthy();
    const guardado = JSON.parse((await AsyncStorage.getItem(CLAVE)) ?? "{}");
    expect(guardado.idempotencyKey).toBe("uuid-1-abcdef");
    expect(guardado.titulo).toBe("No carga la agenda");

    await fireEvent.press(screen.getByTestId("reportar-enviar"));
    expect(await screen.findByText("Recibimos tu reporte")).toBeTruthy();
    expect(enviarMock.mock.calls.map((llamada) => llamada[3])).toEqual(["uuid-1-abcdef", "uuid-1-abcdef"]);
    expect(await AsyncStorage.getItem(CLAVE)).toBeNull();
  });

  it("restaura el borrador pendiente con su clave al volver a abrir", async () => {
    await AsyncStorage.setItem(
      CLAVE,
      JSON.stringify({ idempotencyKey: "clave-vieja-123", tipo: "idea", area: "otra", titulo: "Idea", descripcion: "Una idea muy buena", imagenes: [] }),
    );
    enviarMock.mockResolvedValueOnce({ reporte: reporte(), replay: false });
    await render(<ReportarProblemaScreen onBack={jest.fn()} onVerMisReportes={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId("reportar-enviar"));
    await screen.findByText("Recibimos tu reporte");
    expect(enviarMock.mock.calls[0][3]).toBe("clave-vieja-123");
    expect(enviarMock.mock.calls[0][1]).toEqual({ tipo: "idea", area: "otra", titulo: "Idea", descripcion: "Una idea muy buena" });
  });

  it("413 y 422 muestran mensajes claros y conservan el borrador", async () => {
    enviarMock.mockRejectedValueOnce(new AdminApiError(413, "adjunto_muy_grande", "x"));
    await abrirYLlenar();
    await fireEvent.press(screen.getByTestId("reportar-enviar"));
    expect(await screen.findByText("Una imagen pesa más de 8 MB. Quítala o elige otra.")).toBeTruthy();
    expect(screen.queryByTestId("reportar-pendiente")).toBeNull();
    expect(await AsyncStorage.getItem(CLAVE)).not.toBeNull();
  });

  it("solo ofrece imágenes, hasta 5", async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: Array.from({ length: 6 }, (_, i) => ({ uri: `file:///f${i}.jpg`, width: 100, height: 100 })),
    });
    await render(<ReportarProblemaScreen onBack={jest.fn()} onVerMisReportes={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId("reportar-galeria"));
    await waitFor(() => expect(screen.getByTestId("reportar-quitar-4")).toBeTruthy());
    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5 }),
    );
    expect(screen.queryByTestId("reportar-quitar-5")).toBeNull();
    expect(screen.getByText("Se tomaron las primeras 5: el máximo es 5 imágenes.")).toBeTruthy();
  });

  it("409 de clave ajena: genera otra y reintenta una vez", async () => {
    enviarMock.mockRejectedValueOnce(new AdminApiError(409, "idempotency_key_en_uso", "x"));
    enviarMock.mockResolvedValueOnce({ reporte: reporte(), replay: false });
    await abrirYLlenar();
    await fireEvent.press(screen.getByTestId("reportar-enviar"));
    await screen.findByText("Recibimos tu reporte");
    expect(enviarMock.mock.calls.map((llamada) => llamada[3])).toEqual(["uuid-1-abcdef", "uuid-2-abcdef"]);
  });
});
