jest.mock("expo-secure-store");

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { HojaInvitarColaborador } from "./HojaInvitarColaborador";

const mockGet = jest.fn();
const mockPost = jest.fn();
const api = { get: mockGet, post: mockPost, put: jest.fn(), patch: jest.fn(), del: jest.fn() };

async function renderHoja(esMaster = false) {
  const onCreado = jest.fn();
  const onClose = jest.fn();
  const vista = await render(
    <HojaInvitarColaborador
      visible
      api={api}
      esMaster={esMaster}
      tenantName="Tienda Norte"
      onClose={onClose}
      onCreado={onCreado}
    />,
  );
  return { ...vista, onCreado, onClose };
}

describe("HojaInvitarColaborador", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({ resultado: "creado" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators/pack-roles") {
        return Promise.resolve([{ value: "gestor_cobranza", label: "Gestor de cobranza" }]);
      }
      if (path === "/admin/collaborators/existe") return Promise.resolve({ existe: false });
      if (path === "/admin/collaborators/username-disponible") {
        return Promise.resolve({ disponible: true });
      }
      return Promise.reject(new Error(`no mockeado: ${path}`));
    });
  });

  it("valida el correo antes de continuar", async () => {
    const { getByTestId, getByText } = await renderHoja();

    await fireEvent.changeText(getByTestId("invitar-email"), "ana@");
    await fireEvent.press(getByTestId("invitar-continuar"));

    expect(getByText(/correo válido/)).toBeTruthy();
    expect(mockGet).not.toHaveBeenCalledWith("/admin/collaborators/existe", expect.anything());
  });

  it("invita una cuenta existente sin pedir contraseña", async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators/pack-roles") {
        return Promise.resolve([{ value: "gestor_cobranza", label: "Gestor de cobranza" }]);
      }
      if (path === "/admin/collaborators/existe") return Promise.resolve({ existe: true });
      return Promise.reject(new Error(`no mockeado: ${path}`));
    });
    const { getByTestId, getByText, onCreado } = await renderHoja();

    await fireEvent.changeText(getByTestId("invitar-email"), "ana@demo.test");
    await fireEvent.press(getByTestId("invitar-continuar"));

    await waitFor(() => expect(getByText(/Ya existe una cuenta/)).toBeTruthy());
    expect(getByTestId("invitar-rol-pack:gestor_cobranza")).toBeTruthy();

    await fireEvent.press(getByTestId("invitar-enviar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/invitations", {
        email: "ana@demo.test",
        role: "colaborador",
        pack_roles: [],
      }),
    );
    expect(onCreado).toHaveBeenCalledWith("Invitación enviada.");
  });

  it("crea una cuenta nueva con perfil completo", async () => {
    const { getByTestId, getByText, onCreado } = await renderHoja();

    await fireEvent.changeText(getByTestId("invitar-email"), "nueva@demo.test");
    await fireEvent.press(getByTestId("invitar-continuar"));
    await waitFor(() => expect(getByTestId("invitar-nombre")).toBeTruthy());

    await fireEvent.changeText(getByTestId("invitar-nombre"), "Ana Pérez");
    await fireEvent.changeText(getByTestId("invitar-username"), "ana.perez");
    await fireEvent.changeText(getByTestId("invitar-password"), "clave12345");
    await waitFor(() => expect(getByText("Disponible")).toBeTruthy());

    await fireEvent.press(getByTestId("invitar-enviar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/admin/collaborators",
        expect.objectContaining({
          email: "nueva@demo.test",
          password: "clave12345",
          role: "colaborador",
          username: "ana.perez",
          nombre: "Ana Pérez",
          pack_roles: [],
        }),
      ),
    );
    expect(onCreado).toHaveBeenCalledWith(expect.stringContaining("Cuenta creada"));
  });

  it("muestra el tope del plan con un mensaje claro", async () => {
    mockPost.mockRejectedValue(
      new AdminApiError(409, "plan_limit_colaboradores", "Llegaste al tope de colaboradores de tu plan."),
    );
    const { getByTestId, getByText } = await renderHoja();

    await fireEvent.changeText(getByTestId("invitar-email"), "nueva@demo.test");
    await fireEvent.press(getByTestId("invitar-continuar"));
    await waitFor(() => expect(getByTestId("invitar-nombre")).toBeTruthy());
    await fireEvent.changeText(getByTestId("invitar-nombre"), "Ana Pérez");
    await fireEvent.changeText(getByTestId("invitar-username"), "ana.perez");
    await fireEvent.changeText(getByTestId("invitar-password"), "clave12345");
    await waitFor(() => expect(getByText("Disponible")).toBeTruthy());

    await fireEvent.press(getByTestId("invitar-enviar"));
    await waitFor(() => expect(getByTestId("invitar-limite")).toBeTruthy());
  });
});
