const mockEnExpoGo = jest.fn(() => false);
jest.mock("expo", () => ({
  isRunningInExpoGo: () => mockEnExpoGo(),
}));
jest.mock("expo-notifications", () => ({
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { MAX: 5 },
}));

import * as Notifications from "expo-notifications";
import {
  addListener,
  configurarCanal,
  enExpoGo,
  obtenerTokenExpo,
  solicitarPermisos,
} from "./push";

describe("push (HU-APP-05)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("configura el canal en Android y lo omite en otras plataformas", async () => {
    const { Platform } = require("react-native");
    const original = Platform.OS;
    Platform.OS = "android";
    await configurarCanal();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
    Platform.OS = original;

    await configurarCanal();
    // En el resto de plataformas no se vuelve a llamar.
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(1);
  });

  it("no pide permiso si ya está concedido", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    await expect(solicitarPermisos()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("pide permiso si está sin resolver y respeta la respuesta", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "undetermined",
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    await expect(solicitarPermisos()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it("si el usuario lo negó y ya no se puede volver a preguntar, no insiste", async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
      canAskAgain: false,
    });
    await expect(solicitarPermisos()).resolves.toBe(false);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("en Android pide el permiso aunque llegue 'denied' si aún se puede preguntar", async () => {
    // Android no tiene "undetermined": un permiso nunca pedido llega como denied.
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
      canAskAgain: true,
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    await expect(solicitarPermisos()).resolves.toBe(true);
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it("en Android crea el canal antes de pedir el permiso (sin canal no sale el diálogo)", async () => {
    const { Platform } = require("react-native");
    const original = Platform.OS;
    Platform.OS = "android";
    const orden: string[] = [];
    (Notifications.setNotificationChannelAsync as jest.Mock).mockImplementation(async () => {
      orden.push("canal");
    });
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
      canAskAgain: true,
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockImplementation(async () => {
      orden.push("permiso");
      return { status: "granted" };
    });
    await solicitarPermisos();
    Platform.OS = original;
    expect(orden).toEqual(["canal", "permiso"]);
  });

  it("obtiene el token con el projectId de EAS", async () => {
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: "ExponentPushToken[test]",
    });
    await expect(obtenerTokenExpo("proj-123")).resolves.toBe("ExponentPushToken[test]");
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "proj-123",
    });
  });

  it("en Expo Go todas las utilidades de push son no-op (SDK 53+)", async () => {
    mockEnExpoGo.mockReturnValue(true);
    expect(enExpoGo()).toBe(true);

    await expect(configurarCanal()).resolves.toBeUndefined();
    await expect(solicitarPermisos()).resolves.toBe(false);
    await expect(obtenerTokenExpo("proj-123")).resolves.toBeNull();
    const sub = addListener(jest.fn());
    expect(sub.remove).toBeDefined();

    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    mockEnExpoGo.mockReturnValue(false);
  });

  it("addListener entrega el data de la notificación tocada", async () => {
    const handler = jest.fn();
    const sub = addListener(handler);
    const registrada = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock
      .calls[0][0];
    registrada({
      notification: { request: { content: { data: { type: "cobranza.sync" } } } },
    });
    expect(handler).toHaveBeenCalledWith({ type: "cobranza.sync" });
    expect(sub.remove).toBeDefined();
  });
});
