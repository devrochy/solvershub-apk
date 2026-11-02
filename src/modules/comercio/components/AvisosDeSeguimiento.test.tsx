jest.mock("expo-secure-store");
jest.mock("@core/session/use-admin-api", () => ({ useAdminApi: jest.fn() }));

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useAdminApi } from "@core/session/use-admin-api";
import { avisosDeConfig, textoDeHora } from "../api";
import { AvisosDeSeguimiento } from "./AvisosDeSeguimiento";

const mockUseAdminApi = useAdminApi as jest.Mock;
const mockGet = jest.fn();
const mockPut = jest.fn();

const CONFIG = {
  pipeline_name: "Ventas",
  follow_up_hours: 24,
  seguimiento_recordatorios: true,
  seguimiento_resumen_diario: true,
  seguimiento_resumen_hora: 8,
};

describe("AvisosDeSeguimiento (HU-CRM-22)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminApi.mockReturnValue({ get: mockGet, put: mockPut });
    mockGet.mockResolvedValue({ plugin_id: "pack_commerce", values: CONFIG });
    mockPut.mockImplementation(async (_path: string, cuerpo: { values: Record<string, unknown> }) => ({
      plugin_id: "pack_commerce",
      values: cuerpo.values,
    }));
  });

  it("muestra lo que hay guardado y la hora del resumen", async () => {
    const { findByTestId, getByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    expect(await findByTestId("avisos-seguimiento")).toBeTruthy();
    expect(getByTestId("avisos-hora").props.children).toBe("8:00 a. m.");
    expect(mockGet).toHaveBeenCalledWith("/admin/plugins/pack_commerce/config");
  });

  it("apagar los recordatorios guarda la configuración completa con ese cambio", async () => {
    const { findByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    await fireEvent.press(await findByTestId("avisos-recordatorios"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/plugins/pack_commerce/config", {
        values: { ...CONFIG, seguimiento_recordatorios: false },
      }),
    );
  });

  it("cambia la hora del resumen de a una hora y no pasa del tope", async () => {
    mockGet.mockResolvedValue({ plugin_id: "pack_commerce", values: { ...CONFIG, seguimiento_resumen_hora: 19 } });
    const { findByTestId, getByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    await findByTestId("avisos-hora");
    expect(getByTestId("avisos-hora-mas").props.accessibilityState?.disabled).toBe(true);
    await fireEvent.press(getByTestId("avisos-hora-menos"));
    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/admin/plugins/pack_commerce/config", {
        values: { ...CONFIG, seguimiento_resumen_hora: 18 },
      }),
    );
  });

  it("sin resumen diario no ofrece la hora", async () => {
    mockGet.mockResolvedValue({ plugin_id: "pack_commerce", values: { ...CONFIG, seguimiento_resumen_diario: false } });
    const { findByTestId, queryByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    await findByTestId("avisos-seguimiento");
    expect(queryByTestId("avisos-hora")).toBeNull();
  });

  it("si el servidor lo rechaza vuelve al valor anterior y avisa", async () => {
    mockPut.mockRejectedValue(new Error("Sin permiso para guardar."));
    const { findByTestId, findByText, getByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    await fireEvent.press(await findByTestId("avisos-resumen"));
    expect(await findByText("Sin permiso para guardar.")).toBeTruthy();
    expect(getByTestId("avisos-resumen").props.accessibilityState?.checked).toBe(true);
  });

  it("quien no puede escribir los ve sin poder cambiarlos", async () => {
    const { findByTestId, findByText } = await render(<AvisosDeSeguimiento puedeEscribir={false} />);
    await fireEvent.press(await findByTestId("avisos-recordatorios"));
    expect(await findByText("Solo el dueño puede cambiar estos avisos.")).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("si no puede leer la configuración lo dice y no muestra interruptores", async () => {
    mockGet.mockRejectedValue(new Error("falla"));
    const { findByText, queryByTestId } = await render(<AvisosDeSeguimiento puedeEscribir />);
    expect(await findByText("No pudimos leer los avisos de seguimiento.")).toBeTruthy();
    expect(queryByTestId("avisos-seguimiento")).toBeNull();
  });
});

describe("avisosDeConfig / textoDeHora", () => {
  it("encendido y a las 8 si la configuración no trae los ajustes (backend viejo)", () => {
    expect(avisosDeConfig({})).toEqual({
      seguimiento_recordatorios: true,
      seguimiento_resumen_diario: true,
      seguimiento_resumen_hora: 8,
    });
  });

  it("una hora fuera de 0-19 vuelve a las 8", () => {
    expect(avisosDeConfig({ seguimiento_resumen_hora: 25 }).seguimiento_resumen_hora).toBe(8);
    expect(avisosDeConfig({ seguimiento_resumen_hora: 0 }).seguimiento_resumen_hora).toBe(0);
  });

  it("hora en 12 h", () => {
    expect(textoDeHora(0)).toBe("12:00 a. m.");
    expect(textoDeHora(8)).toBe("8:00 a. m.");
    expect(textoDeHora(12)).toBe("12:00 p. m.");
    expect(textoDeHora(19)).toBe("7:00 p. m.");
  });
});
