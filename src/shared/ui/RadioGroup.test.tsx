import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity } from "@core/theme/tokens";
import { Field } from "./Field";
import { RadioGroup } from "./RadioGroup";
import { areaTactil } from "./test-utils";

const OPCIONES = [
  { value: "ventas", label: "Ventas", description: "Atiende clientes nuevos" },
  { value: "soporte", label: "Soporte" },
  { value: "cobranza", label: "Cobranza", disabled: true },
];

describe("RadioGroup (kit)", () => {
  // El grupo no es `accessible` a propósito: así TalkBack enfoca cada radio por separado.
  it("es un grupo con nombre accesible y una opción por fila", async () => {
    await render(<RadioGroup label="¿Para qué lo usarás?" options={OPCIONES} value="soporte" />);
    expect(screen.getByLabelText("¿Para qué lo usarás?")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marca solo la opción elegida, con el punto interior", async () => {
    await render(<RadioGroup label="Tipo" options={OPCIONES} value="soporte" testID="rg" />);
    expect(screen.getByRole("radio", { name: "Soporte" }).props.accessibilityState).toMatchObject({
      checked: true,
      selected: true,
    });
    expect(screen.getByRole("radio", { name: "Ventas" }).props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId("rg-soporte-punto")).toBeTruthy();
    expect(screen.queryByTestId("rg-ventas-punto")).toBeNull();
  });

  it("muestra el icono de la opción cuando se pasa", async () => {
    await render(
      <RadioGroup
        label="Conexión"
        options={[{ value: "wa", label: "WhatsApp", icono: "chat" }]}
        value="wa"
      />,
    );
    expect(screen.getByTestId("icono-chat")).toBeTruthy();
  });

  it("sin valor no hay ninguna elegida", async () => {
    await render(<RadioGroup label="Tipo" options={OPCIONES} />);
    for (const r of screen.getAllByRole("radio")) expect(r.props.accessibilityState.checked).toBe(false);
  });

  it("al tocar avisa el valor de la opción", async () => {
    const onValueChange = jest.fn();
    await render(<RadioGroup label="Tipo" options={OPCIONES} value="soporte" onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole("radio", { name: "Ventas" }));
    expect(onValueChange).toHaveBeenCalledWith("ventas");
  });

  it("una opción deshabilitada no responde al toque", async () => {
    const onValueChange = jest.fn();
    await render(<RadioGroup label="Tipo" options={OPCIONES} onValueChange={onValueChange} />);
    const r = screen.getByRole("radio", { name: "Cobranza" });
    expect(r.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(r);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("con el grupo deshabilitado ninguna responde", async () => {
    const onValueChange = jest.fn();
    await render(<RadioGroup label="Tipo" options={OPCIONES} disabled onValueChange={onValueChange} />);
    await fireEvent.press(screen.getByRole("radio", { name: "Ventas" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("la descripción se ve y va como pista de su opción", async () => {
    await render(<RadioGroup label="Tipo" options={OPCIONES} />);
    expect(screen.getByText("Atiende clientes nuevos")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Ventas" }).props.accessibilityHint).toBe("Atiende clientes nuevos");
  });

  it("cada fila mide al menos 48 dp de alto", async () => {
    await render(<RadioGroup label="Tipo" options={OPCIONES} />);
    for (const r of screen.getAllByRole("radio")) {
      expect(areaTactil(r).alto).toBeGreaterThanOrEqual(shDensity.controlLg);
    }
  });

  it("dentro de un Field muestra el error del Field", async () => {
    await render(
      <Field label="Tipo" error="Elige una opción">
        <RadioGroup label="Tipo" options={OPCIONES} />
      </Field>,
    );
    expect(screen.getByText("Elige una opción")).toBeTruthy();
    expect(screen.getByTestId("icono-error-outline")).toBeTruthy();
  });
});
