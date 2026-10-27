import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity, shTheme } from "@core/theme/tokens";
import { Checkbox } from "./Checkbox";
import { Field } from "./Field";
import { areaTactil } from "./test-utils";

describe("Checkbox (kit)", () => {
  it("es una casilla con nombre accesible y estado", async () => {
    await render(<Checkbox label="Acepto los términos" checked={false} />);
    const casilla = screen.getByRole("checkbox", { name: "Acepto los términos" });
    expect(casilla.props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(screen.queryByTestId("icono-check")).toBeNull();
  });

  it("marcada muestra la palomita (el estado no va solo en el color)", async () => {
    await render(<Checkbox label="Acepto" checked />);
    expect(screen.getByRole("checkbox", { name: "Acepto" }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId("icono-check")).toBeTruthy();
  });

  it("parcial muestra un guion y se anuncia como mixed", async () => {
    await render(<Checkbox label="Todos" checked="indeterminate" />);
    expect(screen.getByRole("checkbox", { name: "Todos" }).props.accessibilityState.checked).toBe("mixed");
    expect(screen.getByTestId("icono-remove")).toBeTruthy();
  });

  it("al tocar avisa el valor contrario; desde parcial marca", async () => {
    const onCheckedChange = jest.fn();
    const { rerender } = await render(<Checkbox label="Acepto" checked={false} onCheckedChange={onCheckedChange} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Acepto" }));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);

    await rerender(<Checkbox label="Acepto" checked onCheckedChange={onCheckedChange} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Acepto" }));
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);

    await rerender(<Checkbox label="Acepto" checked="indeterminate" onCheckedChange={onCheckedChange} />);
    await fireEvent.press(screen.getByRole("checkbox", { name: "Acepto" }));
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
  });

  it("deshabilitada no responde al toque", async () => {
    const onCheckedChange = jest.fn();
    await render(<Checkbox label="Acepto" checked={false} disabled onCheckedChange={onCheckedChange} />);
    const casilla = screen.getByRole("checkbox", { name: "Acepto" });
    expect(casilla.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(casilla);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("la descripción se ve y va como pista", async () => {
    await render(<Checkbox label="Avisarme" description="Te escribimos por WhatsApp" checked={false} />);
    expect(screen.getByText("Te escribimos por WhatsApp")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Avisarme" }).props.accessibilityHint).toBe("Te escribimos por WhatsApp");
  });

  it("mide al menos 48 dp de alto", async () => {
    await render(<Checkbox label="Acepto" checked={false} />);
    expect(areaTactil(screen.getByRole("checkbox")).alto).toBeGreaterThanOrEqual(shDensity.controlLg);
  });

  it("dentro de un Field con error toma el borde de peligro y la pista del error", async () => {
    await render(
      <Field label="Términos" error="Debes aceptar para continuar">
        <Checkbox label="Acepto" checked={false} testID="cb" />
      </Field>,
    );
    const casilla = screen.getByTestId("cb");
    expect(casilla.props.accessibilityHint).toBe("Debes aceptar para continuar");
    expect(screen.getByText("Debes aceptar para continuar")).toBeTruthy();
    expect(screen.getByTestId("cb-caja")).toHaveStyle({ borderColor: shTheme.light.statusDangerFg });
  });

  it("invalid sin Field pinta el borde de la caja con el color de peligro", async () => {
    await render(<Checkbox label="Acepto" checked={false} invalid testID="cb" />);
    expect(screen.getByTestId("cb-caja")).toHaveStyle({ borderColor: shTheme.light.statusDangerFg });
  });
});
