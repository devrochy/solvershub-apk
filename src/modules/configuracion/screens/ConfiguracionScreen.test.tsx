jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));
jest.mock("@core/session/admin-session-context", () => ({
  useAdminSession: () => ({
    sesion: {
      token: "t",
      role: "owner",
      permissions: { connections: "write", collaborators: "write" },
      tenantId: "tenant-1",
    },
    loading: false,
  }),
}));
jest.mock("@data/ajustes", () => ({
  CLAVE_PUSH_HABILITADO: "push_habilitado",
  leerAjuste: jest.fn(() => Promise.resolve("1")),
  guardarAjuste: jest.fn(() => Promise.resolve()),
}));

import { Alert, Linking } from "react-native";
import { apiRoot } from "@core/config";
import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { guardarAjuste as mockGuardarAjuste } from "@data/ajustes";
import { ConfiguracionScreen } from "./ConfiguracionScreen";
import catalogo from "../testing/catalogo.json";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const cliente = { get: mockGet, post: mockPost, put: mockPut, patch: jest.fn(), del: jest.fn() };

describe("ConfiguracionScreen (HU-APP-12)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue(cliente);
    mockPost.mockResolvedValue(undefined);
    mockGet.mockImplementation((path: string) => {
      if (path === "/admin/collaborators") {
        return Promise.resolve([
          {
            id: "a-1",
            email: "vendedor@x.com",
            username: null,
            role: "colaborador",
            active: true,
            is_self: false,
            is_platform_master: false,
            permissions: [],
            links: [],
          },
        ]);
      }
      if (path === "/admin/invitations/outgoing") {
        return Promise.resolve([]);
      }
      if (path === "/admin/plugins") {
        return Promise.resolve([
          {
            id: "pack_cobranza",
            name: "pack_cobranza",
            version: "1.0",
            status: "active",
            error_message: null,
            has_config: true,
            enabled_for_tenant: true,
            tenant_health_error: null,
            display_name: "Cobranza",
            category: "vertical",
            description: "",
            required_connections: [],
          },
        ]);
      }
      if (path === "/admin/connections") {
        return Promise.resolve({
          items: [
            {
              id: "cx-1",
              kind: "whatsapp",
              type_id: "meta",
              origin: "manual",
              channel: "whatsapp",
              label: "Principal",
              external_id: "123",
              active: true,
              is_primary: true,
              created_at: "2026-10-01T00:00:00Z",
              coexistence: false,
            },
            {
              id: "google-1",
              kind: "google_calendar",
              type_id: "google_calendar",
              origin: "oauth",
              channel: "",
              label: "Agenda de Ana",
              external_id: "ana@demo.test",
              active: true,
              is_primary: false,
              created_at: "2026-10-01T00:00:00Z",
              coexistence: false,
            },
          ],
          webhook_url: "https://x/webhooks",
        });
      }
      // SPEC-37: el catálogo real del dueño (volcado del backend) y las palabras de baja.
      if (path === "/admin/settings/catalog") return Promise.resolve(catalogo);
      if (path === "/admin/settings/bajas") {
        return Promise.resolve({ palabras: [], por_defecto: ["baja", "stop"], usa_por_defecto: true });
      }
      if (path === "/admin/settings") {
        return Promise.resolve({
          identity: {
            assistant_name: "Ana",
            auto_escalate_after_turns: 0,
            available_guardrails: [],
            bot_paused: false,
            brand_voice: "",
            brand_voice_warning: false,
            business_description: "Tienda de ropa",
            business_ranges: [],
            out_of_hours_default_message: "Estamos fuera de horario.",
            business_tz: "America/Bogota",
            currency: "COP",
            debounce_mode: "natural",
            difficulty_long_message_threshold: 400,
            difficulty_score_threshold: 3,
            difficulty_turnos_sin_resolver_threshold: 3,
            disabled_guardrails: [],
            escalation_keywords: [],
            guardrail_fail_action: "escalate",
            guardrail_max_retries: 2,
            out_of_hours_message: "",
            persona_emojis: "none",
            persona_forbidden: [],
            persona_max_length: 0,
            persona_tone: "neutral",
            persona_warmth: 3,
            split_style: "un_mensaje",
            timezone: "America/Bogota",
            tono: "formal",
          },
          brain: {
            model_fallback: null,
            model_primary: "gpt-4o-mini",
            model_router: null,
            model_temperature: 0.3,
            policy_budget: 0.5,
            policy_max_tool_calls: 10,
          },
          memory: { rag_min_score: 0.6, rag_top_k: 5, short_term_turns: 12 },
          skills: [],
        });
      }
      if (path === "/admin/meta/checklist/requirements") {
        return Promise.resolve({
          steps: [
            {
              key: "wa-number",
              label: "Número de WhatsApp verificado",
              link: "https://x",
              done: false,
              notes: "",
            },
          ],
          checks: [{ key: "webhook", ok: true, detail: "responde" }],
          meta_configured: true,
        });
      }
      if (path === "/admin/meta/checklist/production") {
        return Promise.resolve({
          steps: [
            { key: "rls", label: "RLS forzado", link: "https://x", done: true, notes: "ok" },
          ],
          checks: [],
          meta_configured: true,
        });
      }
      if (String(path).includes("/templates")) {
        return Promise.resolve({ templates: [], sync_error: null, at_limit: false });
      }
      return Promise.reject(new Error("no mockeado"));
    });
  });

  it("desactiva una habilidad con confirmación", async () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, botones) => {
      botones?.find((b) => b.text === "Confirmar")?.onPress?.();
    });

    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-habilidades")).toBeTruthy());

    await fireEvent.press(getByTestId("config-habilidades"));
    expect(getByText("Cobranza")).toBeTruthy();
    await fireEvent.press(getByTestId("habilidad-pack_cobranza"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/plugins/pack_cobranza/action", {
        action: "deactivate",
      }),
    );
    alertSpy.mockRestore();
  });

  it("lista conexiones con su estado", async () => {
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    expect(getByText("Principal · principal")).toBeTruthy();
  });

  it("alterna el opt-out de push (HU-APP-21)", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-notificaciones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-notificaciones"));
    await waitFor(() => expect(getByTestId("push-toggle")).toBeTruthy());

    await fireEvent(getByTestId("push-toggle"), "valueChange", false);
    await waitFor(() => expect(mockGuardarAjuste).toHaveBeenCalledWith("push_habilitado", "0"));
  });

  it("muestra Google Calendar en Conexiones y abre el panel (HU-CAL-08)", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());
    await fireEvent.press(getByTestId("config-conexiones"));

    await waitFor(() => expect(getByTestId("google-calendar")).toBeTruthy());
    expect(getByText("Agenda de Ana")).toBeTruthy();
    await fireEvent.press(getByTestId("google-conectar"));
    expect(abrir).toHaveBeenCalledWith(`${apiRoot()}/calendario?ajustes=agendas&tenant=tenant-1`);
    abrir.mockRestore();
  });

  it("abre plantillas de una conexión y sincroniza (HU-APP-21)", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    await waitFor(() => expect(getByTestId("conexion-cx-1")).toBeTruthy());

    await fireEvent.press(getByTestId("conexion-cx-1"));
    await waitFor(() => expect(getByTestId("plantillas-sync")).toBeTruthy());

    await fireEvent.press(getByTestId("plantillas-sync"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/meta/connections/cx-1/templates/sync"),
    );
  });

  it("carga y guarda la identidad del agente (cierre de réplica)", async () => {
    mockPut.mockResolvedValue(undefined);
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-ajustes")).toBeTruthy());

    await fireEvent.press(getByTestId("config-ajustes"));
    await waitFor(() => expect(getByTestId("ajustes-assistant_name")).toBeTruthy());
    expect(getByTestId("ajustes-assistant_name").props.value).toBe("Ana");

    await fireEvent.changeText(getByTestId("ajustes-assistant_name"), "Ana María");
    await fireEvent.press(getByTestId("ajustes-guardar"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith(
        "/admin/settings/identity",
        expect.objectContaining({ assistant_name: "Ana María" }),
      ),
    );
    await waitFor(() => expect(getByTestId("ajustes-mensaje")).toBeTruthy());
    // La confirmación va junto al botón (abajo del formulario), no arriba fuera de pantalla.
    expect(within(getByTestId("ajustes-pie")).getByTestId("ajustes-mensaje")).toBeTruthy();
  });

  it("muestra y guarda los requisitos de Meta (cierre de réplica)", async () => {
    mockPost.mockResolvedValue(undefined);
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    await fireEvent.press(getByTestId("subconex-meta"));
    await waitFor(() => expect(getByText("Número de WhatsApp verificado")).toBeTruthy());
    expect(getByText(/0 de 1 pasos completados/)).toBeTruthy();

    await fireEvent(getByTestId("checklist-toggle-wa-number"), "valueChange", true);
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/meta/checklist/step", {
        step_key: "wa-number",
        done: true,
        notes: "",
      }),
    );
  });

  it("ejecuta las comprobaciones de producción de Meta (cierre de réplica)", async () => {
    mockPost.mockResolvedValue([{ key: "rls", ok: true, detail: "ok" }]);
    const { getByTestId } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    await fireEvent.press(getByTestId("subconex-meta"));
    await waitFor(() => expect(getByTestId("checklist-sub-production")).toBeTruthy());

    await fireEvent.press(getByTestId("checklist-sub-production"));
    await waitFor(() => expect(getByTestId("checklist-correr")).toBeTruthy());
    await fireEvent.press(getByTestId("checklist-correr"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/meta/checklist/production/run", {}),
    );
  });

  it("una comprobación no concluyente (ok=null) se muestra como info, no como fallo", async () => {
    mockPost.mockResolvedValue([
      { key: "rls_tests_pass", ok: null, detail: "Los tests corren en CI" },
      { key: "connections_health", ok: false, detail: "Sin conexiones" },
    ]);
    const { getByTestId, getByText } = await render(<ConfiguracionScreen />);
    await waitFor(() => expect(getByTestId("config-conexiones")).toBeTruthy());

    await fireEvent.press(getByTestId("config-conexiones"));
    await fireEvent.press(getByTestId("subconex-meta"));
    await waitFor(() => expect(getByTestId("checklist-sub-production")).toBeTruthy());
    await fireEvent.press(getByTestId("checklist-sub-production"));
    await waitFor(() => expect(getByTestId("checklist-correr")).toBeTruthy());
    await fireEvent.press(getByTestId("checklist-correr"));

    await waitFor(() => expect(getByTestId("check-estado-rls_tests_pass")).toBeTruthy());
    expect(getByTestId("check-estado-rls_tests_pass").props.children).toBe("info");
    expect(getByTestId("check-estado-connections_health").props.children).toBe("revisar");
    expect(getByText("Los tests corren en CI")).toBeTruthy();
  });

  it("abre en la pestaña pedida por el cajón del panel (HU-DS-11)", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen pestanaInicial={{ pestana: "habilidades", n: 1 }} />);
    await waitFor(() => expect(getByTestId("config-habilidades")).toHaveStyle({ borderBottomWidth: 2 }));
  });
});
