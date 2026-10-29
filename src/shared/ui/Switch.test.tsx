import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity } from "@core/theme/tokens";
import { Switch } from "./Switch";
import { areaTactil } from "./test-utils";

describe("Switch (kit)", () => {
  it("es un switch con nombre accesible y estado", async () => {
    await render(<Switch label="Responder fuera de horario" value={false} />);
    const s = screen.getByRole("switch", { name: "Responder fuera de horario" });
    expect(s.props.accessibilityState).toEqual({ checked: false, disabled: false });
  });

  it("encendido lleva palomita y apagado equis (no solo color)", async () => {
    const { rerender } = await render(<Switch label="Activo" value />);
    expect(screen.getByTestId("icono-check")).toBeTruthy();
    expect(screen.queryByTestId("icono-close")).toBeNull();

    await rerender(<Switch label="Activo" value={false} />);
    expect(screen.getByTestId("icono-close")).toBeTruthy();
    expect(screen.queryByTestId("icono-check")).toBeNull();
  });

  it("la bola va al extremo según el valor", async () => {
    const { rerender } = await render(<Switch label="Activo" value testID="sw" />);
    expect(screen.getByTestId("sw-pista")).toHaveStyle({ alignItems: "flex-end" });
    await rerender(<Switch label="Activo" value={false} testID="sw" />);
    expect(screen.getByTestId("sw-pista")).toHaveStyle({ alignItems: "flex-start" });
  });

  it("al tocar avisa el valor contrario", async () => {
    const onValueChange = jest.fn();
    const { rerender } = await render(<Switch label="Activo" value={false} onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole("switch", { name: "Activo" }));
    expect(onValueChange).toHaveBeenLastCalledWith(true);

    await rerender(<Switch label="Activo" value onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole("switch", { name: "Activo" }));
    expect(onValueChange).toHaveBeenLastCalledWith(false);
  });

  it("deshabilitado no responde al toque", async () => {
    const onValueChange = jest.fn();
    await render(<Switch label="Activo" value={false} disabled onValueChange={onValueChange} />);
    const s = screen.getByRole("switch", { name: "Activo" });
    expect(s.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(s);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("la descripción se ve y va como pista", async () => {
    await render(<Switch label="Recordatorios" description="Un día antes del vencimiento" value={false} />);
    expect(screen.getByText("Un día antes del vencimiento")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Recordatorios" }).props.accessibilityHint).toBe(
      "Un día antes del vencimiento",
    );
  });

  it("compacto conserva nombre y estado sin el texto visible", async () => {
    await render(<Switch compact label="Pausar el agente" value={false} testID="sw" />);
    const s = screen.getByRole("switch", { name: "Pausar el agente" });
    expect(s.props.accessibilityState.checked).toBe(false);
    expect(screen.queryByText("Pausar el agente")).toBeNull();
    expect(screen.getByTestId("sw-pista")).toBeTruthy();
  });

  it("mide al menos 48 dp de alto", async () => {
    await render(<Switch label="Activo" value={false} />);
    expect(areaTactil(screen.getByRole("switch")).alto).toBeGreaterThanOrEqual(shDensity.controlLg);
  });
});
