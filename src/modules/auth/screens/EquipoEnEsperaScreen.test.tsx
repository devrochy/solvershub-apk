jest.mock("@core/theme/theme-context", () => {
  const actual = jest.requireActual("@core/theme/theme-context");
  return actual;
});

import { act, fireEvent, render } from "@testing-library/react-native";
import type { EstadoDelEquipo } from "@core/api/acceso";
import { EquipoEnEsperaScreen, INTERVALO_DE_SONDEO_MS, vistaDeEquipo } from "./EquipoEnEsperaScreen";

const PENDIENTE: EstadoDelEquipo = { estado: "pendiente", permitido: false, politica: "restringido", requiereVinculacion: true };
const ACTIVO: EstadoDelEquipo = { estado: "activo", permitido: true, politica: "restringido", requiereVinculacion: false };
const BLOQUEADO: EstadoDelEquipo = { estado: "bloqueado", permitido: false, politica: "restringido", requiereVinculacion: false };

describe("EquipoEnEsperaScreen (HU-ACC-05)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("traduce el código del backend a la vista", () => {
    expect(vistaDeEquipo("dispositivo_pendiente")).toBe("pendiente");
    expect(vistaDeEquipo("dispositivo_no_autorizado")).toBe("pendiente");
    expect(vistaDeEquipo("dispositivo_bloqueado")).toBe("bloqueado");
    expect(vistaDeEquipo("dispositivo_requerido")).toBe("sin_id");
  });

  it("pendiente: explica la espera y entra sola al aprobarse, sin pedir la clave", async () => {
    const consultar = jest.fn().mockResolvedValueOnce(PENDIENTE).mockResolvedValueOnce(ACTIVO);
    const alAprobado = jest.fn();
    const { getByTestId } = await render(
      <EquipoEnEsperaScreen codigo="dispositivo_pendiente" consultar={consultar} alAprobado={alAprobado} cerrarSesion={jest.fn()} />,
    );
    expect(getByTestId("equipo-titulo").props.children).toBe("Este equipo espera aprobación");

    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS);
    });
    expect(consultar).toHaveBeenCalledTimes(1);
    expect(alAprobado).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS);
    });
    expect(consultar).toHaveBeenCalledTimes(2);
    expect(alAprobado).toHaveBeenCalledTimes(1);
  });

  it("pendiente: si lo bloquean mientras espera, pasa a la vista de bloqueo y deja de sondear", async () => {
    const consultar = jest.fn().mockResolvedValue(BLOQUEADO);
    const { getByTestId } = await render(
      <EquipoEnEsperaScreen codigo="dispositivo_pendiente" consultar={consultar} alAprobado={jest.fn()} cerrarSesion={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS);
    });
    expect(getByTestId("equipo-titulo").props.children).toBe("Este equipo fue bloqueado");
    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS * 3);
    });
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it("bloqueado: dice que el negocio lo bloqueó, no sondea y deja cerrar sesión", async () => {
    const consultar = jest.fn();
    const cerrarSesion = jest.fn();
    const { getByTestId } = await render(
      <EquipoEnEsperaScreen codigo="dispositivo_bloqueado" consultar={consultar} alAprobado={jest.fn()} cerrarSesion={cerrarSesion} />,
    );
    expect(getByTestId("equipo-titulo").props.children).toBe("Este equipo fue bloqueado");
    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS * 3);
    });
    expect(consultar).not.toHaveBeenCalled();
    await fireEvent.press(getByTestId("equipo-salir"));
    expect(cerrarSesion).toHaveBeenCalled();
  });

  it("sin conexión sigue intentando y lo dice", async () => {
    const consultar = jest.fn().mockRejectedValue(new Error("red"));
    const { getByTestId } = await render(
      <EquipoEnEsperaScreen codigo="dispositivo_pendiente" consultar={consultar} alAprobado={jest.fn()} cerrarSesion={jest.fn()} />,
    );
    await act(async () => {
      jest.advanceTimersByTime(INTERVALO_DE_SONDEO_MS);
    });
    expect(getByTestId("equipo-sondeo").props.children).toMatch(/Sin conexión/);
  });
});
