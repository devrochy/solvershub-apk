import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { NotificacionesProvider, useNotificaciones } from "./notificaciones-context";
import { SessionContext, SessionValue } from "./session-context";
import type { NotificacionPublic } from "../types/gestor";

const notis: NotificacionPublic[] = [
  {
    id: "pago-1",
    tipo: "pago",
    mensaje: "Pago registrado",
    carteraId: "1",
    carteraNombre: "Cartera Centro",
    clienteId: "1",
    monto: 100,
    fecha: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "gasto-2",
    tipo: "gasto",
    mensaje: "Gasto registrado",
    carteraId: "1",
    carteraNombre: "Cartera Centro",
    clienteId: null,
    monto: 50,
    fecha: "2026-09-02T00:00:00.000Z",
  },
];

function Probe() {
  const { items, descartar } = useNotificaciones();
  return (
    <>
      <Text testID="count">{items.length}</Text>
      <Text testID="ids">{items.map((n) => n.id).join(",")}</Text>
      <Pressable testID="descartar-pago" onPress={() => void descartar("pago-1")}>
        <Text>descartar</Text>
      </Pressable>
    </>
  );
}

function renderCtx() {
  const session: SessionValue = {
    gestor: { id: "20", usuario: "gestor1", nombre: "C", apellido: "L", rol: "gestor" },
    loading: false,
    api: {
      notificaciones: jest.fn().mockResolvedValue(notis),
    } as unknown as SessionValue["api"],
    login: jest.fn(),
    logout: jest.fn(),
    actualizarPerfil: jest.fn(),
    requiereVinculacion: false,
    marcarDispositivoVinculado: jest.fn(),
    negociosPendientes: [],
    membresiaToken: null,
    invitaciones: [],
    seleccionarNegocio: jest.fn(),
    resolverInvitacion: jest.fn(),
  };
  return render(
    <SessionContext.Provider value={session}>
      <NotificacionesProvider>
        <Probe />
      </NotificacionesProvider>
    </SessionContext.Provider>,
  );
}

describe("NotificacionesProvider", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carga las notificaciones del API", async () => {
    const { getByTestId } = await renderCtx();

    await waitFor(() => expect(getByTestId("count").props.children).toBe(2));
    expect(getByTestId("ids").props.children).toBe("pago-1,gasto-2");
  });

  it("descartar elimina la notificación de la lista", async () => {
    const { getByTestId } = await renderCtx();
    await waitFor(() => expect(getByTestId("count").props.children).toBe(2));

    await fireEvent.press(getByTestId("descartar-pago"));

    await waitFor(() => expect(getByTestId("count").props.children).toBe(1));
    expect(getByTestId("ids").props.children).toBe("gasto-2");
  });
});
