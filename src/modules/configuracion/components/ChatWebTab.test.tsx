jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { Share } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { ChatWebTab } from "./ChatWebTab";

const mockGet = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: jest.fn(), put: mockPut, patch: jest.fn(), del: jest.fn() };

const ACTUAL = {
  enabled: true,
  allowed_origins: ["https://uno.com", "https://dos.com"],
  key: "wc_123",
  snippet: '<script src="https://test.solvershub.site/widget.js" data-key="wc_123"></script>',
  turnstile_configured: false,
};

describe("ChatWebTab (HU-APP-12 · Chat web)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAdminApi as jest.Mock).mockReturnValue(cliente);
    mockGet.mockResolvedValue(ACTUAL);
  });

  it("carga el estado, los dominios y el fragmento", async () => {
    const { getByTestId } = await render(<ChatWebTab />);
    await waitFor(() => expect(getByTestId("chatweb-origenes")).toBeTruthy());
    expect(mockGet).toHaveBeenCalledWith("/admin/settings/web-chat");
    expect(getByTestId("chatweb-activo").props.value).toBe(true);
    expect(getByTestId("chatweb-origenes").props.value).toBe("https://uno.com\nhttps://dos.com");
    expect(getByTestId("chatweb-fragmento").props.children).toBe(ACTUAL.snippet);
  });

  it("guarda sin tocar el secreto de Turnstile si queda vacío", async () => {
    mockPut.mockResolvedValue({ ...ACTUAL, allowed_origins: ["https://tres.com"] });
    const { getByTestId } = await render(<ChatWebTab />);
    await waitFor(() => expect(getByTestId("chatweb-origenes")).toBeTruthy());

    await fireEvent.changeText(getByTestId("chatweb-origenes"), " https://tres.com , \n");
    await fireEvent.press(getByTestId("chatweb-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/settings/web-chat", {
        enabled: true,
        allowed_origins: ["https://tres.com"],
        turnstile_secret: undefined,
        rotate_key: false,
      }),
    );
    await waitFor(() => expect(getByTestId("chatweb-mensaje")).toBeTruthy());
  });

  it("rotar la clave muestra el fragmento nuevo", async () => {
    const nuevo = '<script src="https://test.solvershub.site/widget.js" data-key="wc_999"></script>';
    mockPut.mockResolvedValue({ ...ACTUAL, key: "wc_999", snippet: nuevo });
    const { getByTestId } = await render(<ChatWebTab />);
    await waitFor(() => expect(getByTestId("chatweb-rotar")).toBeTruthy());

    await fireEvent(getByTestId("chatweb-rotar"), "valueChange", true);
    await fireEvent.changeText(getByTestId("chatweb-turnstile"), "  0x-secreto  ");
    await fireEvent.press(getByTestId("chatweb-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/settings/web-chat",
        expect.objectContaining({ rotate_key: true, turnstile_secret: "0x-secreto" }),
      ),
    );
    await waitFor(() => expect(getByTestId("chatweb-fragmento").props.children).toBe(nuevo));
  });

  it("comparte el fragmento", async () => {
    const compartir = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
    const { getByTestId } = await render(<ChatWebTab />);
    await waitFor(() => expect(getByTestId("chatweb-compartir")).toBeTruthy());

    await fireEvent.press(getByTestId("chatweb-compartir"));
    expect(compartir).toHaveBeenCalledWith({ message: ACTUAL.snippet });
  });
});
