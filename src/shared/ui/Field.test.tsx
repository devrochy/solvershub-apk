import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity, shTheme } from "@core/theme/tokens";
import { Field } from "./Field";
import { TextField } from "./TextField";
import { areaTactil } from "./test-utils";

describe("Field + TextField (kit)", () => {
  it("el control toma el label del Field como nombre accesible", async () => {
    const onChangeText = jest.fn();
    await render(
      <Field label="Nombre del cliente" hint="Como aparece en el documento">
        <TextField value="" onChangeText={onChangeText} />
      </Field>,
    );

    // Label y ayuda se ven, pero el lector de pantalla los oye en el control (no dos veces).
    const oculto = { includeHiddenElements: true };
    expect(screen.getByText("Nombre del cliente", oculto)).toBeTruthy();
    expect(screen.getByText("Como aparece en el documento", oculto)).toBeTruthy();
    expect(screen.queryByText("Nombre del cliente")).toBeNull();
    const input = screen.getByLabelText("Nombre del cliente");
    expect(input.props.accessibilityHint).toBe("Como aparece en el documento");
    await fireEvent.changeText(input, "Laura");
    expect(onChangeText).toHaveBeenCalledWith("Laura");
  });

  it("required: marca visible y 'obligatorio' en el nombre accesible", async () => {
    await render(
      <Field label="Teléfono" required>
        <TextField />
      </Field>,
    );
    expect(screen.getByText("*", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText("Teléfono, obligatorio")).toBeTruthy();
  });

  it("error: mensaje con ícono en una región viva y control inválido con borde de peligro", async () => {
    await render(
      <Field label="Monto" error="Escribe un monto mayor a cero">
        <TextField value="0" />
      </Field>,
    );

    const mensaje = screen.getByTestId("field-error");
    expect(mensaje.props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByText("Escribe un monto mayor a cero")).toBeTruthy();
    expect(screen.getByTestId("icono-error-outline")).toBeTruthy();
    const input = screen.getByLabelText("Monto");
    expect(input.props.accessibilityHint).toBe("Escribe un monto mayor a cero");
    expect(input).toHaveStyle({ borderColor: shTheme.light.statusDangerFg });
  });

  it("TextField solo: invalid y disabled sin Field", async () => {
    await render(<TextField accessibilityLabel="Buscar" invalid disabled />);
    const input = screen.getByLabelText("Buscar");
    expect(input).toHaveStyle({ borderColor: shTheme.light.statusDangerFg });
    expect(input.props.editable).toBe(false);
    expect(input).toBeDisabled();
  });

  it("el campo mide al menos 48 dp de alto", async () => {
    await render(<TextField accessibilityLabel="Nota" />);
    expect(areaTactil(screen.getByLabelText("Nota")).alto).toBeGreaterThanOrEqual(shDensity.controlLg);
  });
});
