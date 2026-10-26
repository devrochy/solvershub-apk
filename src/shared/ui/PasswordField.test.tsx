import { fireEvent, render, screen } from "@testing-library/react-native";
import { Field } from "./Field";
import { PasswordField } from "./PasswordField";
import { areaTactil } from "./test-utils";

describe("PasswordField (kit)", () => {
  it("arranca oculto y el ojo alterna la visibilidad", async () => {
    await render(<PasswordField testID="clave" accessibilityLabel="Contraseña" />);
    expect(screen.getByTestId("clave").props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByTestId("clave").props.secureTextEntry).toBe(false);

    const ocultar = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(ocultar).toBeSelected();
    await fireEvent.press(ocultar);
    expect(screen.getByTestId("clave").props.secureTextEntry).toBe(true);
  });

  it("la etiqueta cambia el nombre accesible del ojo", async () => {
    await render(<PasswordField etiqueta="PIN" />);
    expect(screen.getByRole("button", { name: "Mostrar PIN" })).toBeTruthy();
  });

  it("el ojo mide al menos 48 × 48 dp y tiene testID derivado", async () => {
    await render(<PasswordField testID="clave" />);
    const { alto, ancho } = areaTactil(screen.getByTestId("clave-ojo"));
    expect(alto).toBeGreaterThanOrEqual(48);
    expect(ancho).toBeGreaterThanOrEqual(48);
  });

  it("dentro de un Field toma su nombre accesible y conserva el texto escrito al alternar", async () => {
    const onChangeText = jest.fn();
    await render(
      <Field label="Contraseña">
        <PasswordField testID="clave" value="abc12345" onChangeText={onChangeText} />
      </Field>,
    );
    expect(screen.getByLabelText("Contraseña")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(screen.getByTestId("clave").props.value).toBe("abc12345");
  });
});
