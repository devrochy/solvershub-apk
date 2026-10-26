jest.mock("./push", () => ({
  configurarCanal: jest.fn().mockResolvedValue(undefined),
  configurarPrimerPlano: jest.fn(),
  addRecibidaListener: jest.fn(() => ({ remove: jest.fn() })),
  solicitarPermisos: jest.fn(),
  obtenerTokenExpo: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  consumirRespuestaInicial: jest.fn(),
}));
const mockLeerAjuste = jest.fn();
jest.mock("@data/ajustes", () => ({
  CLAVE_PUSH_HABILITADO: "push_habilitado",
  leerAjuste: (...args: unknown[]) => mockLeerAjuste(...args),
  suscribirAjustes: () => () => undefined,
}));
jest.mock("./api", () => ({
  registrarPushToken: jest.fn().mockResolvedValue(undefined),
  darDeBajaPushToken: jest.fn().mockResolvedValue(undefined),
}));

import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { darDeBajaPushToken, registrarPushToken } from "./api";
import { PushProvider } from "./provider";
import {
  addListener,
  addRecibidaListener,
  consumirRespuestaInicial,
  obtenerTokenExpo,
  solicitarPermisos,
} from "./push";

function renderPush(adminToken: string | null, tenantId: string | null) {
  return render(
    <PushProvider
      adminToken={adminToken}
      tenantId={tenantId}
      projectId="proj-123"
      alTocarNotificacion={jest.fn()}
    >
      <Text>hijo</Text>
    </PushProvider>,
  );
}

describe("PushProvider (HU-APP-05)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeerAjuste.mockResolvedValue(null);
  });

  it("despacha el push que abrió la app estando cerrada (arranque en frío)", async () => {
    (consumirRespuestaInicial as jest.Mock).mockReturnValue({ type: "core.escalation" });
    const alTocar = jest.fn();

    await render(
      <PushProvider adminToken={null} tenantId={null} projectId="p" alTocarNotificacion={alTocar}>
        <Text>hijo</Text>
      </PushProvider>,
    );

    await waitFor(() => expect(alTocar).toHaveBeenCalledWith({ type: "core.escalation" }));
  });

  it("si no se puede leer el opt-out, registra igual (solo un '0' explícito apaga el push)", async () => {
    mockLeerAjuste.mockRejectedValue(new Error("no such table: ajuste_local"));
    (solicitarPermisos as jest.Mock).mockResolvedValue(true);
    (obtenerTokenExpo as jest.Mock).mockResolvedValue("ExponentPushToken[abc]");

    await renderPush("t-opaco", "t-1");

    await waitFor(() => expect(registrarPushToken).toHaveBeenCalled());
  });

  it("con el push apagado en Ajustes no pide permiso", async () => {
    mockLeerAjuste.mockResolvedValue("0");

    await renderPush("t-opaco", "t-1");
    await act(async () => undefined);

    expect(solicitarPermisos).not.toHaveBeenCalled();
  });

  it("con sesión y permiso registra el token del dispositivo", async () => {
    (solicitarPermisos as jest.Mock).mockResolvedValue(true);
    (obtenerTokenExpo as jest.Mock).mockResolvedValue("ExponentPushToken[abc]");

    await renderPush("t-opaco", "t-1");

    await waitFor(() =>
      expect(registrarPushToken).toHaveBeenCalledWith(
        "t-opaco",
        "t-1",
        "ExponentPushToken[abc]",
        "android",
      ),
    );
  });

  it("si no obtiene el token (p. ej. sin FCM) lo deja en el log en vez de tragarlo", async () => {
    const aviso = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    (solicitarPermisos as jest.Mock).mockResolvedValue(true);
    (obtenerTokenExpo as jest.Mock).mockRejectedValue(
      new Error("Default FirebaseApp is not initialized in this process"),
    );

    await renderPush("t-opaco", "t-1");

    await waitFor(() =>
      expect(aviso).toHaveBeenCalledWith(
        "[push] no se obtuvo el token Expo",
        "Default FirebaseApp is not initialized in this process",
      ),
    );
    expect(registrarPushToken).not.toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("sin permiso no pide token ni registra", async () => {
    (solicitarPermisos as jest.Mock).mockResolvedValue(false);

    await renderPush("t-opaco", "t-1");
    await act(async () => undefined);

    expect(obtenerTokenExpo).not.toHaveBeenCalled();
    expect(registrarPushToken).not.toHaveBeenCalled();
  });

  it("sin sesión no hace nada", async () => {
    await renderPush(null, null);
    await act(async () => undefined);
    expect(solicitarPermisos).not.toHaveBeenCalled();
  });

  it("al cambiar de negocio da de baja el registro anterior", async () => {
    (solicitarPermisos as jest.Mock).mockResolvedValue(true);
    (obtenerTokenExpo as jest.Mock).mockResolvedValue("ExponentPushToken[abc]");

    const { rerender } = await renderPush("t-opaco", "t-1");
    await waitFor(() => expect(registrarPushToken).toHaveBeenCalledTimes(1));

    await rerender(
      <PushProvider
        adminToken="t-opaco"
        tenantId="t-2"
        projectId="proj-123"
        alTocarNotificacion={jest.fn()}
      >
        <Text>hijo</Text>
      </PushProvider>,
    );

    await waitFor(() =>
      expect(darDeBajaPushToken).toHaveBeenCalledWith(
        "t-opaco",
        "t-1",
        "ExponentPushToken[abc]",
      ),
    );
    await waitFor(() => expect(registrarPushToken).toHaveBeenCalledTimes(2));
  });

  it("al tocar una notificación delega el data al compositor", async () => {
    const alTocar = jest.fn();
    await render(
      <PushProvider
        adminToken={null}
        tenantId={null}
        projectId="proj-123"
        alTocarNotificacion={alTocar}
      >
        <Text>hijo</Text>
      </PushProvider>,
    );

    await waitFor(() => expect(addListener).toHaveBeenCalled());
    const registrada = (addListener as jest.Mock).mock.calls[0][0];
    await act(async () => {
      registrada({ type: "cobranza.sync" });
    });
    expect(alTocar).toHaveBeenCalledWith({ type: "cobranza.sync" });
  });

  it("al llegar una notificación con la app abierta avisa al compositor", async () => {
    const alRecibir = jest.fn();
    await render(
      <PushProvider
        adminToken={null}
        tenantId={null}
        projectId="proj-123"
        alTocarNotificacion={jest.fn()}
        alRecibirNotificacion={alRecibir}
      >
        <Text>hijo</Text>
      </PushProvider>,
    );
    await waitFor(() => expect(addRecibidaListener).toHaveBeenCalled());
    const registrada = (addRecibidaListener as jest.Mock).mock.calls[0][0];
    await act(async () => {
      registrada({ type: "core.escalation" }, { title: "Nueva escalación", body: "Un cliente pidió una persona." });
    });
    expect(alRecibir).toHaveBeenCalledWith(
      { type: "core.escalation" },
      { title: "Nueva escalación", body: "Un cliente pidió una persona." },
    );
  });

  it("al cerrar sesión da de baja el token con el token de sesión con que se registró", async () => {
    (solicitarPermisos as jest.Mock).mockResolvedValue(true);
    (obtenerTokenExpo as jest.Mock).mockResolvedValue("ExponentPushToken[abc]");

    const { rerender } = await renderPush("t-opaco", "t-1");
    await waitFor(() => expect(registrarPushToken).toHaveBeenCalledTimes(1));

    await rerender(
      <PushProvider adminToken={null} tenantId={null} projectId="proj-123" alTocarNotificacion={jest.fn()}>
        <Text>hijo</Text>
      </PushProvider>,
    );

    // Antes se llamaba con "" (Bearer vacío) y el backend lo rechazaba: el token quedaba activo.
    await waitFor(() =>
      expect(darDeBajaPushToken).toHaveBeenCalledWith("t-opaco", "t-1", "ExponentPushToken[abc]"),
    );
  });
});
