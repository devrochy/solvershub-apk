jest.mock("expo-secure-store");

import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { GestoresTab } from "./GestoresTab";

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDel = jest.fn();
const api = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: mockDel } as never;

describe("GestoresTab (cierre de réplica)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue(undefined);
    mockPut.mockResolvedValue(undefined);
    mockDel.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/pack/cobranza/collectors") {
        return Promise.resolve([
          { id: "g-1", nombre: "Gestor Demo", correo: "gestor@demo.test", telefono: "3001234567", codigo: null, estatus: "activo" },
        ]);
      }
      if (String(path).includes("/permissions")) {
        return Promise.resolve({
          catalogo: ["registrar_pago", "ver_cartera"],
          activos: ["ver_cartera"],
        });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("lista los gestores", async () => {
    const { getByTestId, getByText } = await render(<GestoresTab api={api} />);
    await waitFor(() => expect(getByTestId("gestores-lista")).toBeTruthy());
    expect(getByText("Gestor Demo")).toBeTruthy();
    expect(getByText("3001234567 · gestor@demo.test")).toBeTruthy();
  });

  it("crea un gestor desde el modal", async () => {
    mockPost.mockResolvedValue({ resultado: "creado" });
    const { getByTestId } = await render(<GestoresTab api={api} />);
    await waitFor(() => expect(getByTestId("gestores-lista")).toBeTruthy());

    await fireEvent.press(getByTestId("gestores-nuevo"));
    await fireEvent.changeText(getByTestId("gestor-nombre"), "Nuevo Cobrador");
    await fireEvent.changeText(getByTestId("gestor-telefono"), "3112223344");
    await fireEvent.changeText(getByTestId("gestor-correo"), "nuevo@demo.test");
    await fireEvent.changeText(getByTestId("gestor-password"), "clave123");
    await fireEvent.press(getByTestId("gestor-guardar"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/pack/cobranza/collectors", {
        nombre: "Nuevo Cobrador",
        correo: "nuevo@demo.test",
        telefono: "3112223344",
        password: "clave123",
      }),
    );
  });

  it("edita permisos y guarda la matriz", async () => {
    const { getByTestId } = await render(<GestoresTab api={api} />);
    await waitFor(() => expect(getByTestId("gestores-lista")).toBeTruthy());

    await fireEvent.press(getByTestId("gestor-g-1"));
    await waitFor(() => expect(getByTestId("permiso-registrar_pago")).toBeTruthy());

    await fireEvent.press(getByTestId("permiso-registrar_pago"));
    await fireEvent.press(getByTestId("gestor-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/pack/cobranza/collectors/g-1/permissions", {
        permisos: ["ver_cartera", "registrar_pago"],
      }),
    );
  });

  it("elimina con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Eliminar")?.onPress?.();
    });
    const { getByTestId } = await render(<GestoresTab api={api} />);
    await waitFor(() => expect(getByTestId("gestores-lista")).toBeTruthy());

    await fireEvent.press(getByTestId("gestor-g-1"));
    await waitFor(() => expect(getByTestId("gestor-eliminar")).toBeTruthy());
    await fireEvent.press(getByTestId("gestor-eliminar"));

    await waitFor(() => expect(mockDel).toHaveBeenCalledWith("/pack/cobranza/collectors/g-1"));
    alertSpy.mockRestore();
  });
});
