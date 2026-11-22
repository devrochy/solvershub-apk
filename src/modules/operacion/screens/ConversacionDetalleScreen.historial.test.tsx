jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({ useAdminSessionOpcional: jest.fn() }));
jest.mock("@shared/navegacion-evento", () => ({ emitirNavegacion: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminSessionOpcional } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { ConversacionDetalleScreen } from "./ConversacionDetalleScreen";

// HU-BILL-25/27: una conversación más vieja que el historial del plan (409 `plan_feature_not_included`,
// `feature = historial`) muestra el aviso del plan, no «revisa tu conexión».

const mockGet = jest.fn();
const route = { params: { id: "cv-vieja", titulo: "Juanita" } } as never;
const HISTORIAL = new AdminApiError(409, "plan_feature_not_included", "Tu plan no incluye esto.", undefined, {
  feature: "historial",
  plan: "basic",
  historial_dias: 90,
});

function navegacion() {
  return { navigate: jest.fn(), goBack: jest.fn() };
}

describe("ConversacionDetalleScreen · fuera del historial del plan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue({ get: mockGet, post: jest.fn(), put: jest.fn(), patch: jest.fn(), del: jest.fn() });
    mockGet.mockRejectedValue(HISTORIAL);
  });

  it("explica los días del plan, que no se borró nada, y ofrece mejorar el plan a quien puede", async () => {
    (useAdminSessionOpcional as jest.Mock).mockReturnValue({ sesion: { role: "admin", permissions: { plan: "write" } } });
    const nav = navegacion();
    const { findByText, getByText, queryByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={nav as never} />,
    );
    expect(await findByText("Esta conversación es de hace más de 90 días")).toBeTruthy();
    expect(getByText(/Tu plan muestra 90 días de historial\. No se borró nada/)).toBeTruthy();
    expect(queryByText(/Revisa tu conexión/)).toBeNull();
    await fireEvent.press(getByText("Mejorar mi plan"));
    expect(emitirNavegacion).toHaveBeenCalledWith({ tab: "negocio", pestana: "plan" });
    await fireEvent.press(getByText("Volver"));
    expect(nav.goBack).toHaveBeenCalled();
  });

  it("sin permiso de plan solo ofrece volver", async () => {
    (useAdminSessionOpcional as jest.Mock).mockReturnValue({ sesion: { role: "admin", permissions: { conversations: "read" } } });
    const { findByText, queryByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={navegacion() as never} />,
    );
    expect(await findByText("Esta conversación es de hace más de 90 días")).toBeTruthy();
    expect(queryByText("Mejorar mi plan")).toBeNull();
  });

  it("otro error sigue siendo el de conexión", async () => {
    (useAdminSessionOpcional as jest.Mock).mockReturnValue(null);
    mockGet.mockRejectedValue(new Error("sin red"));
    const { findByText, queryByText } = await render(
      <ConversacionDetalleScreen route={route} navigation={navegacion() as never} />,
    );
    await waitFor(async () => expect(await findByText(/Revisa tu conexión/)).toBeTruthy());
    expect(queryByText(/historial/)).toBeNull();
  });
});
