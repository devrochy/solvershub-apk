jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({ sesion: { tenantId: "t1", tenantName: "Moda Sur", role: "admin", permissions: {} } }),
}));

import { Text } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { AvisoDeOnboarding, OnboardingProvider, useOnboarding } from "./index";
import type { Recorrido } from "./logica";

const mockGet = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() };

const omitido: Recorrido = { estado: "omitido", paso: 3, total_pasos: 6, aplica: true, abrir: false, avisar: true };

function respuestas(recorrido: Recorrido, rol: string) {
  mockGet.mockImplementation((path: string) => {
    if (path === "/admin/onboarding") return Promise.resolve({ recorrido });
    if (path === "/admin/me") return Promise.resolve({ role: "admin", tenant: { role: rol } });
    return Promise.reject(new Error(path));
  });
}

function Sonda() {
  const { abierto } = useOnboarding();
  return <Text testID="sonda">{abierto ? "abierto" : "cerrado"}</Text>;
}

describe("AvisoDeOnboarding (HU-APP-22)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
  });

  it("al dueño que omitió le deja un aviso fijo con el botón para continuar", async () => {
    respuestas(omitido, "owner");
    const api = await render(
      <OnboardingProvider>
        <AvisoDeOnboarding />
        <Sonda />
      </OnboardingProvider>,
    );
    await waitFor(() => api.getByTestId("aviso-onboarding"));
    expect(api.getByText("Tu agente aún no está listo para probar. Faltan 4 pasos.")).toBeTruthy();
    await fireEvent.press(api.getByTestId("aviso-onboarding-continuar"));
    // Con el asistente abierto el aviso se oculta: no se duplica.
    expect(api.getByTestId("sonda").props.children).toBe("abierto");
    await waitFor(() => expect(api.queryByTestId("aviso-onboarding")).toBeNull());
  });

  it("no avisa a quien no puede terminarlo ni cuando el recorrido está completo", async () => {
    respuestas(omitido, "viewer");
    const a = await render(
      <OnboardingProvider>
        <AvisoDeOnboarding />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/admin/me"));
    expect(a.queryByTestId("aviso-onboarding")).toBeNull();
    a.unmount();

    respuestas({ ...omitido, estado: "completo", avisar: false }, "owner");
    const b = await render(
      <OnboardingProvider>
        <AvisoDeOnboarding />
      </OnboardingProvider>,
    );
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith("/admin/me"));
    expect(b.queryByTestId("aviso-onboarding")).toBeNull();
  });
});
