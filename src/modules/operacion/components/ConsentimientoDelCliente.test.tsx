jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { ConsentimientoDelCliente } from "./ConsentimientoDelCliente";
import {
  AVISO_BAJA_DEL_CLIENTE,
  AVISO_SOLO_PROPIETARIO,
  esBajaDelCliente,
  esPropietarioOPlataforma,
  mensajeDeErrorAlGuardarConsentimiento,
} from "../consentimiento-promos";

const fila = (estado: "otorgado" | "revocado", origen: string) => ({
  estado,
  origen,
  evidencia: "",
  quien: "alguien",
  created_at: "2026-11-07T10:00:00Z",
});
const bajaFicha = { estado: "revocado", historial: [fila("revocado", "ficha")] };
const bajaPalabra = { estado: "revocado", historial: [fila("revocado", "palabra_de_baja")] };
const baja131050 = { estado: "revocado", historial: [fila("revocado", "meta_131050")] };
const otorgado = { estado: "otorgado", historial: [fila("otorgado", "ficha")] };

describe("ConsentimientoDelCliente", () => {
  const mockGet = jest.fn();
  const mockPost = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ estado: "sin_registro", historial: [] });
    (useAdminApi as jest.Mock).mockReturnValue({
      get: mockGet,
      post: mockPost,
      put: jest.fn(),
      patch: jest.fn(),
      del: jest.fn(),
    });
  });

  it("carga el estado y registra el consentimiento con su origen", async () => {
    mockPost.mockResolvedValue({ estado: "otorgado", historial: [] });
    const { findByTestId, getByTestId, findByText } = await render(
      <ConsentimientoDelCliente leadId="c-1" esPropietario />,
    );
    await fireEvent.press(await findByTestId("consentimiento-marcar"));
    await fireEvent.press(getByTestId("consentimiento-como-por_telefono"));
    await fireEvent.changeText(getByTestId("consentimiento-evidencia"), "Llamada del 21/10");
    await fireEvent.press(getByTestId("consentimiento-guardar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", {
        estado: "otorgado",
        como: "por_telefono",
        evidencia: "Llamada del 21/10",
      }),
    );
    expect(await findByText("Acepta promociones")).toBeTruthy();
  });

  it("revoca el consentimiento si ya estaba otorgado", async () => {
    mockGet.mockResolvedValue({
      estado: "otorgado",
      historial: [
        { estado: "otorgado", origen: "ficha", evidencia: "", quien: "Dueña", created_at: "2026-10-21T00:00:00Z" },
      ],
    });
    mockPost.mockResolvedValue({ estado: "revocado", historial: [] });
    const { findByTestId, findByText } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
    await fireEvent.press(await findByTestId("consentimiento-revocar"));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", {
        estado: "revocado",
        como: "otro",
        evidencia: "",
      }),
    );
    expect(await findByText("Se dio de baja")).toBeTruthy();
  });

  it("el detalle es obligatorio con cualquier «Cómo lo obtuviste»: Guardar sigue apagado si está vacío o en blanco", async () => {
    const { findByTestId, getByTestId } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
    await fireEvent.press(await findByTestId("consentimiento-marcar"));
    for (const como of ["en_el_local", "por_telefono", "por_escrito", "otro"]) {
      await fireEvent.press(getByTestId(`consentimiento-como-${como}`));
      await fireEvent.changeText(getByTestId("consentimiento-evidencia"), "   ");
      expect(getByTestId("consentimiento-guardar").props.accessibilityState.disabled).toBe(true);
      await fireEvent.changeText(getByTestId("consentimiento-evidencia"), "Dijo que sí");
      expect(getByTestId("consentimiento-guardar").props.accessibilityState.disabled).toBe(false);
    }
    expect(mockPost).not.toHaveBeenCalled();
  });

  describe("quién ofrece «Aceptó recibir promociones» (D-SPEC-33-9)", () => {
    const sesiones = {
      propietario: { role: "user", tenantRole: "owner" },
      master: { role: "master", tenantRole: null },
      tester: { role: "tester", tenantRole: null },
      colaboradorConClientesEnEscritura: { role: "user", tenantRole: "colaborador" },
    };

    it.each([
      ["propietario", sesiones.propietario, true],
      ["master", sesiones.master, true],
      ["tester", sesiones.tester, true],
      ["colaborador con Clientes en escritura", sesiones.colaboradorConClientesEnEscritura, false],
    ] as const)("sin registro: %s", async (_nombre, sesion, visible) => {
      const { findByText, queryByTestId } = await render(
        <ConsentimientoDelCliente leadId="c-1" esPropietario={esPropietarioOPlataforma(sesion)} />,
      );
      await findByText("Sin consentimiento");
      expect(Boolean(queryByTestId("consentimiento-marcar"))).toBe(visible);
      expect(Boolean(queryByTestId("consentimiento-solo-propietario"))).toBe(!visible);
    });

    it("sin la prop, por defecto no se ofrece (cerrado ante la duda)", async () => {
      const { findByText, queryByTestId } = await render(<ConsentimientoDelCliente leadId="c-1" />);
      await findByText("Sin consentimiento");
      expect(queryByTestId("consentimiento-marcar")).toBeNull();
    });

    it("el colaborador sí puede marcar que ya no acepta", async () => {
      mockGet.mockResolvedValue(otorgado);
      mockPost.mockResolvedValue(bajaFicha);
      const { findByTestId, findByText } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario={false} />);
      await fireEvent.press(await findByTestId("consentimiento-revocar"));
      await waitFor(() =>
        expect(mockPost).toHaveBeenCalledWith("/admin/leads/c-1/consentimiento", { estado: "revocado", como: "otro", evidencia: "" }),
      );
      expect(await findByText("Se dio de baja")).toBeTruthy();
    });

    it("el colaborador ve una baja hecha desde la ficha pero no puede reactivarla", async () => {
      mockGet.mockResolvedValue(bajaFicha);
      const { findByText, queryByTestId } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario={false} />);
      expect(await findByText(AVISO_SOLO_PROPIETARIO)).toBeTruthy();
      expect(queryByTestId("consentimiento-marcar")).toBeNull();
    });

    it("el propietario puede reactivar una baja que dejó un colaborador en la ficha", async () => {
      mockGet.mockResolvedValue(bajaFicha);
      const { findByTestId, queryByText } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
      expect(await findByTestId("consentimiento-marcar")).toBeTruthy();
      expect(queryByText(AVISO_BAJA_DEL_CLIENTE)).toBeNull();
    });
  });

  describe("baja del cliente: no se reactiva desde la ficha", () => {
    it.each([
      ["palabra de baja", bajaPalabra],
      ["131050 de Meta", baja131050],
    ] as const)("%s: ni el propietario ve la acción y se explica por qué", async (_n, datos) => {
      mockGet.mockResolvedValue(datos);
      const { findByText, queryByTestId } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
      expect(await findByText(AVISO_BAJA_DEL_CLIENTE)).toBeTruthy();
      expect(queryByTestId("consentimiento-marcar")).toBeNull();
      expect(queryByTestId("consentimiento-revocar")).toBeNull();
      expect(queryByTestId("consentimiento-solo-propietario")).toBeNull();
    });

    it("el colaborador ve la explicación de la baja del cliente, no la del propietario", async () => {
      mockGet.mockResolvedValue(bajaPalabra);
      const { findByText, queryByText } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario={false} />);
      expect(await findByText(AVISO_BAJA_DEL_CLIENTE)).toBeTruthy();
      expect(queryByText(AVISO_SOLO_PROPIETARIO)).toBeNull();
    });

    it("si el cliente aceptó de nuevo después de una baja, vuelve el estado normal", async () => {
      mockGet.mockResolvedValue({ estado: "otorgado", historial: [fila("otorgado", "ficha"), fila("revocado", "palabra_de_baja")] });
      const { findByTestId, queryByText } = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
      expect(await findByTestId("consentimiento-revocar")).toBeTruthy();
      expect(queryByText(AVISO_BAJA_DEL_CLIENTE)).toBeNull();
    });
  });

  describe("errores del servidor", () => {
    async function guardarComoPropietario(error: AdminApiError, despues?: unknown) {
      mockPost.mockRejectedValue(error);
      const vista = await render(<ConsentimientoDelCliente leadId="c-1" esPropietario />);
      await fireEvent.press(await vista.findByTestId("consentimiento-marcar"));
      await fireEvent.changeText(vista.getByTestId("consentimiento-evidencia"), "Firmó la planilla");
      if (despues) mockGet.mockResolvedValue(despues);
      await fireEvent.press(vista.getByTestId("consentimiento-guardar"));
      return vista;
    }

    it("409 baja_del_cliente se traduce y se vuelve a leer el estado", async () => {
      const { findByText, findByTestId, queryByTestId } = await guardarComoPropietario(
        new AdminApiError(409, "baja_del_cliente", "texto del servidor"),
        bajaPalabra,
      );
      expect((await findByTestId("consentimiento-error")).props.children).toBe(AVISO_BAJA_DEL_CLIENTE);
      expect(await findByTestId("consentimiento-baja-del-cliente")).toBeTruthy();
      expect(await findByText("Se dio de baja")).toBeTruthy();
      expect(queryByTestId("consentimiento-marcar")).toBeNull();
    });

    it("403 se traduce al mensaje del propietario", async () => {
      const { findByTestId } = await guardarComoPropietario(new AdminApiError(403, "forbidden", "Forbidden"));
      expect((await findByTestId("consentimiento-error")).props.children).toBe(AVISO_SOLO_PROPIETARIO);
    });
  });

  describe("consentimiento-promos", () => {
    it("esBajaDelCliente solo si la última fila es una baja del cliente o de Meta", () => {
      expect(esBajaDelCliente(bajaPalabra as never)).toBe(true);
      expect(esBajaDelCliente(baja131050 as never)).toBe(true);
      expect(esBajaDelCliente(bajaFicha as never)).toBe(false);
      expect(esBajaDelCliente(otorgado as never)).toBe(false);
      expect(esBajaDelCliente({ estado: "sin_registro", historial: [] })).toBe(false);
      expect(esBajaDelCliente(null)).toBe(false);
    });

    it("mensajeDeErrorAlGuardarConsentimiento", () => {
      expect(mensajeDeErrorAlGuardarConsentimiento(new AdminApiError(403, "x", "x"))).toBe(AVISO_SOLO_PROPIETARIO);
      expect(mensajeDeErrorAlGuardarConsentimiento(new AdminApiError(409, "baja_del_cliente", "x"))).toBe(AVISO_BAJA_DEL_CLIENTE);
      expect(mensajeDeErrorAlGuardarConsentimiento(new AdminApiError(409, "otro", "x"))).toBe("No se pudo guardar el consentimiento.");
      expect(mensajeDeErrorAlGuardarConsentimiento(new Error("red"))).toBe("No se pudo guardar el consentimiento.");
    });
  });
});
