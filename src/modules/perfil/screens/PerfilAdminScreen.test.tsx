const mockSesion = {
  token: "t",
  adminId: "a-1",
  email: "dueno-a@demo.test",
  nombre: "Dueño Demo",
  username: "dueno",
  role: "owner",
  tenantId: "t-1",
  tenantName: "Cobranza Demo",
  permissions: {},
};
const mockPerfil = {
  nombre: "Dueño Demo",
  username: "dueno",
  telefono: "+5917000111",
  avatarUrl: "https://api.test/files/avatar.jpg",
  email: "dueno-a@demo.test",
  role: "owner",
  tenantName: "Cobranza Demo",
};
const mockRefrescarPerfil = jest.fn();
const mockAplicarPerfil = jest.fn();

jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: mockSesion,
    perfil: mockPerfil,
    loading: false,
    refrescarPerfil: mockRefrescarPerfil,
    aplicarPerfil: mockAplicarPerfil,
    logout: jest.fn(),
  }),
}));
jest.mock("@core/api/perfil-admin", () => ({
  apiGuardarPerfilAdmin: jest.fn(),
  apiCambiarPasswordAdmin: jest.fn(),
  apiSubirAvatarAdmin: jest.fn(),
  apiQuitarAvatarAdmin: jest.fn(),
}));
jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

import * as ImagePicker from "expo-image-picker";
import { manipulateAsync } from "expo-image-manipulator";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  apiCambiarPasswordAdmin,
  apiGuardarPerfilAdmin,
  apiQuitarAvatarAdmin,
  apiSubirAvatarAdmin,
} from "@core/api/perfil-admin";
import { ThemeProvider } from "@core/theme/theme-context";
import { PerfilAdminScreen } from "./PerfilAdminScreen";

const guardarMock = apiGuardarPerfilAdmin as jest.MockedFunction<typeof apiGuardarPerfilAdmin>;
const passwordMock = apiCambiarPasswordAdmin as jest.MockedFunction<typeof apiCambiarPasswordAdmin>;
const quitarMock = apiQuitarAvatarAdmin as jest.MockedFunction<typeof apiQuitarAvatarAdmin>;
const subirMock = apiSubirAvatarAdmin as jest.MockedFunction<typeof apiSubirAvatarAdmin>;
const pickerMock = ImagePicker as jest.Mocked<typeof ImagePicker>;
const manipularMock = manipulateAsync as jest.MockedFunction<typeof manipulateAsync>;

const ME = {
  admin_id: "a-1",
  email: "dueno-a@demo.test",
  username: "dueno",
  nombre: "Dueño Nuevo",
  telefono: "+5917000111",
  avatar_url: "https://api.test/files/avatar.jpg",
  role: "owner",
  tenant: { id: "t-1", name: "Cobranza Demo", role: "owner", active: true },
  tenant_count: 1,
  permissions: {},
  invitaciones_pendientes: 0,
  qa_testers_habilitados: false,
};

async function renderPerfil(onBack = jest.fn()) {
  const utils = await render(
    <ThemeProvider>
      <PerfilAdminScreen onBack={onBack} />
    </ThemeProvider>,
  );
  return { ...utils, onBack };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRefrescarPerfil.mockResolvedValue(undefined);
  mockAplicarPerfil.mockResolvedValue(undefined);
  guardarMock.mockResolvedValue(ME);
  passwordMock.mockResolvedValue(undefined);
  quitarMock.mockResolvedValue(undefined);
  subirMock.mockResolvedValue(ME);
  pickerMock.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true } as never);
  pickerMock.launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: "file:///foto.png", width: 1200, height: 1200, mimeType: "image/png" }],
  } as never);
  manipularMock.mockResolvedValue({ uri: "file:///avatar.jpg" } as never);
});

describe("PerfilAdminScreen", () => {
  it("muestra los datos del perfil, refresca al abrir y vuelve con el botón", async () => {
    const { getByTestId, getByLabelText, onBack } = await renderPerfil();
    expect(getByTestId("perfil-admin")).toBeTruthy();
    expect(getByTestId("perfil-nombre")).toHaveProp("value", "Dueño Demo");
    expect(getByTestId("perfil-email")).toHaveProp("value", "dueno-a@demo.test");
    expect(getByTestId("perfil-usuario")).toHaveProp("value", "dueno");
    expect(getByTestId("perfil-telefono-numero")).toHaveProp("value", "7000111");
    expect(mockRefrescarPerfil).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByLabelText("Volver"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("guarda nombre, teléfono y usuario", async () => {
    const { getByTestId } = await renderPerfil();
    await fireEvent.changeText(getByTestId("perfil-nombre"), "Dueño Nuevo");
    await fireEvent.press(getByTestId("perfil-guardar"));

    await waitFor(() =>
      expect(guardarMock).toHaveBeenCalledWith(mockSesion, {
        nombre: "Dueño Nuevo",
        telefono: "+5917000111",
        username: "dueno",
      }),
    );
    expect(mockAplicarPerfil).toHaveBeenCalledWith(ME);
    expect(getByTestId("perfil-mensaje")).toBeTruthy();
  });

  it("valida el usuario antes de llamar a la API", async () => {
    const { getByTestId } = await renderPerfil();
    await fireEvent.changeText(getByTestId("perfil-usuario"), "a");
    await fireEvent.press(getByTestId("perfil-guardar"));

    expect(getByTestId("perfil-error")).toBeTruthy();
    expect(guardarMock).not.toHaveBeenCalled();
  });

  it("muestra el error del backend al guardar", async () => {
    guardarMock.mockRejectedValueOnce(new Error("Ese nombre de usuario ya está en uso."));
    const { getByTestId } = await renderPerfil();
    await fireEvent.press(getByTestId("perfil-guardar"));

    await waitFor(() => expect(getByTestId("perfil-error").props.children).toBe("Ese nombre de usuario ya está en uso."));
  });

  it("cambia la contraseña con validación y limpia el formulario", async () => {
    const { getByTestId, queryByTestId } = await renderPerfil();
    await fireEvent.press(getByTestId("perfil-password-toggle"));
    await fireEvent.changeText(getByTestId("perfil-password-actual"), "actual123");
    await fireEvent.changeText(getByTestId("perfil-password-nueva"), "nueva1234");
    await fireEvent.changeText(getByTestId("perfil-password-confirmar"), "nueva1234");
    await fireEvent.press(getByTestId("perfil-password-guardar"));

    await waitFor(() =>
      expect(passwordMock).toHaveBeenCalledWith(mockSesion, { actual: "actual123", nueva: "nueva1234" }),
    );
    await waitFor(() => expect(queryByTestId("perfil-password-actual")).toBeNull());
    expect(getByTestId("perfil-mensaje")).toBeTruthy();
  });

  it("avisa si las contraseñas no coinciden", async () => {
    const { getByTestId } = await renderPerfil();
    await fireEvent.press(getByTestId("perfil-password-toggle"));
    await fireEvent.changeText(getByTestId("perfil-password-actual"), "actual123");
    await fireEvent.changeText(getByTestId("perfil-password-nueva"), "nueva1234");
    await fireEvent.changeText(getByTestId("perfil-password-confirmar"), "otra1234");
    await fireEvent.press(getByTestId("perfil-password-guardar"));

    expect(getByTestId("perfil-password-error").props.children).toBe("Las contraseñas no coinciden.");
    expect(passwordMock).not.toHaveBeenCalled();
  });

  it("sube la foto preparada y aplica el perfil devuelto", async () => {
    const { getByTestId } = await renderPerfil();
    await fireEvent.press(getByTestId("perfil-avatar-cambiar"));

    await waitFor(() =>
      expect(subirMock).toHaveBeenCalledWith(mockSesion, {
        uri: "file:///avatar.jpg",
        name: "avatar.jpg",
        type: "image/jpeg",
      }),
    );
    expect(mockAplicarPerfil).toHaveBeenCalledWith(ME);
    expect(getByTestId("perfil-mensaje").props.children).toBe("Foto actualizada.");
  });

  it("quita la foto y refresca el perfil", async () => {
    const { getByTestId } = await renderPerfil();
    await fireEvent.press(getByTestId("perfil-avatar-quitar"));

    await waitFor(() => expect(quitarMock).toHaveBeenCalledWith(mockSesion));
    await waitFor(() => expect(mockRefrescarPerfil).toHaveBeenCalledTimes(2));
    expect(getByTestId("perfil-mensaje").props.children).toBe("Foto quitada.");
  });
});
