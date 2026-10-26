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
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3 },
}));

import * as Notifications from "expo-notifications";
import {
  addListener,
  CANALES_ANDROID,
  configurarCanal,
  consumirRespuestaInicial,
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
    // El general más uno por categoría del centro de notificaciones (ADR-0167).
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(CANALES_ANDROID.length);
    expect((Notifications.setNotificationChannelAsync as jest.Mock).mock.calls.map((c) => c[0])).toEqual([
      "solvershub-general",
      "solvershub-conversaciones",
      "solvershub-ventas",
      "solvershub-cobros",
      "solvershub-agenda",
      "solvershub-sistema",
    ]);
    Platform.OS = original;

    await configurarCanal();
    // En el resto de plataformas no se vuelve a llamar.
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(CANALES_ANDROID.length);
  });

  it("devuelve una sola vez el push que abrió la app (arranque en frío)", () => {
    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue({
      notification: { request: { content: { data: { type: "core.escalation" } } } },
    });
    expect(consumirRespuestaInicial()).toEqual({ type: "core.escalation" });
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalled();

    (Notifications.getLastNotificationResponse as jest.Mock).mockReturnValue(null);
    expect(consumirRespuestaInicial()).toBeUndefined();
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
    // Un canal por categoría (+ el genérico): todos antes del diálogo de permiso.
    expect(orden.at(-1)).toBe("permiso");
    expect(orden.slice(0, -1).length).toBeGreaterThan(0);
    expect(new Set(orden.slice(0, -1))).toEqual(new Set(["canal"]));
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
