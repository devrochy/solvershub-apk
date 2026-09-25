import { act, fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { SessionProvider, useSession } from "./session-context";

const mockActualizarPerfil = jest.fn();
jest.mock("../api/gestor", () => ({
  gestorApi: () => ({
    actualizarPerfil: mockActualizarPerfil,
  }),
}));

jest.mock("./token-store", () => ({
  readProfile: jest.fn(async () => ({
    id: "7",
    usuario: "cob1",
    nombre: "Viejo",
    apellido: "Anterior",
    rol: "gestor",
  })),
  readSession: jest.fn(async () => ({ accessToken: "a", refreshToken: "r" })),
  writeSession: jest.fn(async () => {}),
  writeProfile: jest.fn(async () => {}),
  clearSession: jest.fn(async () => {}),
  sessionGateway: {
    getTokens: jest.fn(),
    saveTokens: jest.fn(),
    clear: jest.fn(),
  },
}));

import * as tokenStore from "./token-store";

function Consumidor() {
  const { gestor, actualizarPerfil } = useSession();
  return (
    <>
      <Text testID="nombre">{gestor?.nombre ?? "-"}</Text>
      <Pressable
        testID="guardar"
        onPress={() => {
          void actualizarPerfil({ nombre: "Nuevo", apellido: "Pérez" });
        }}
      >
        <Text>guardar</Text>
      </Pressable>
    </>
  );
}

describe("SessionProvider.actualizarPerfil", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActualizarPerfil.mockResolvedValue({
      id: "7",
      usuario: "cob1",
      nombre: "Nuevo",
      apellido: "Pérez",
    });
  });

  it("actualiza el perfil en el estado y lo persiste con el rol actual", async () => {
    const { getByTestId } = await render(
      <SessionProvider>
        <Consumidor />
      </SessionProvider>,
    );

    await act(async () => {});
    expect(getByTestId("nombre").props.children).toBe("Viejo");

    await act(async () => {
      fireEvent.press(getByTestId("guardar"));
    });

    expect(getByTestId("nombre").props.children).toBe("Nuevo");
    expect(tokenStore.writeProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "Nuevo",
        apellido: "Pérez",
        rol: "gestor",
      }),
    );
  });
});
