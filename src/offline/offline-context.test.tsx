const mockCaptura: { listener?: (s: { isConnected: boolean }) => void } = {};

jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn((cb: (s: { isConnected: boolean }) => void) => {
    mockCaptura.listener = cb;
    return jest.fn();
  }),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));

jest.mock("./cola", () => ({
  contarCola: jest.fn().mockResolvedValue(0),
  encolar: jest.fn().mockResolvedValue({}),
  existePendiente: jest.fn().mockResolvedValue(false),
  listarCola: jest.fn().mockResolvedValue([]),
  removerDeCola: jest.fn(),
}));

jest.mock("../api/offline-sync", () => ({
  sincronizarCola: jest.fn().mockResolvedValue([]),
}));

import { act, render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as cola from "./cola";
import { sincronizarCola } from "../api/offline-sync";
import { OfflineContext, OfflineProvider, OfflineValue } from "./offline-context";

async function renderConProvider() {
  const ref = { current: null as OfflineValue | null };
  const rendered = await render(
    <OfflineProvider>
      <OfflineContext.Consumer>
        {(valor) => {
          ref.current = valor;
          return (
            <Text testID="estado">
              {valor?.isOnline ? "online" : "offline"}|{valor?.sinSubir ?? 0}
            </Text>
          );
        }}
      </OfflineContext.Consumer>
    </OfflineProvider>,
  );
  return { ...rendered, ref };
}

describe("OfflineProvider", () => {
  beforeEach(() => jest.clearAllMocks());

  it("inicia online y reporta sinSubir inicial", async () => {
    (cola.contarCola as jest.Mock).mockResolvedValue(2);
    const { getByTestId } = await renderConProvider();

    await waitFor(() => expect(getByTestId("estado")).toHaveTextContent(/^online\|2/));
  });

  it("cambia a offline cuando netinfo reporta desconexión", async () => {
    (cola.contarCola as jest.Mock).mockResolvedValue(0);
    const { getByTestId } = await renderConProvider();
    await waitFor(() => expect(getByTestId("estado")).toHaveTextContent(/^online\|0/));

    await act(async () => {
      mockCaptura.listener?.({ isConnected: false });
    });

    await waitFor(() => expect(getByTestId("estado")).toHaveTextContent(/^offline\|0/));
  });

  it("encolar incrementa el contador sin subir", async () => {
    (cola.contarCola as jest.Mock).mockResolvedValue(0);
    const { getByTestId, ref } = await renderConProvider();
    await waitFor(() => expect(getByTestId("estado")).toBeTruthy());

    (cola.contarCola as jest.Mock).mockResolvedValue(3);
    await act(async () => {
      await ref.current!.encolar("visita", { clienteId: 2 });
    });

    await waitFor(() => expect(getByTestId("estado")).toHaveTextContent(/^online\|3/));
    expect(cola.encolar).toHaveBeenCalledWith("visita", { clienteId: 2 });
  });

  it("sincroniza la cola al conectarse y remueve los confirmados", async () => {
    (cola.listarCola as jest.Mock).mockResolvedValue([
      { eventoIdCliente: "a", tipoEvento: "visita", payload: {}, creadoEn: "" },
    ]);
    (sincronizarCola as jest.Mock).mockResolvedValue(["a"]);
    (cola.contarCola as jest.Mock).mockResolvedValue(0);
    const { getByTestId } = await renderConProvider();

    await waitFor(() => expect(sincronizarCola).toHaveBeenCalled());
    await waitFor(() => expect(cola.removerDeCola).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(getByTestId("estado")).toHaveTextContent(/^online\|0/));
  });

  it("encolarSiNoExiste encola si no hay pendiente y devuelve false si ya existe", async () => {
    (cola.contarCola as jest.Mock).mockResolvedValue(0);
    const { ref } = await renderConProvider();
    await waitFor(() => expect(ref.current).toBeTruthy());

    (cola.existePendiente as jest.Mock).mockResolvedValue(false);
    await act(async () => {
      await expect(
        ref.current!.encolarSiNoExiste("visita", { cuotaId: 3359 }, "pago-3359"),
      ).resolves.toBe(true);
    });
    expect(cola.encolar).toHaveBeenCalledWith("visita", { cuotaId: 3359 }, "pago-3359");

    (cola.existePendiente as jest.Mock).mockResolvedValue(true);
    await act(async () => {
      await expect(
        ref.current!.encolarSiNoExiste("visita", { cuotaId: 3359 }, "pago-3359"),
      ).resolves.toBe(false);
    });
    expect(cola.encolar).toHaveBeenCalledTimes(1);
  });
});