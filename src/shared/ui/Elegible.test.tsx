import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Chip, Elegible } from "./Elegible";

describe("Elegible y Chip (kit, HU-APP-23)", () => {
  it("anuncia rol, estado y la etiqueta en palabra", async () => {
    const onPress = jest.fn();
    await render(<Elegible titulo="Vendo productos" ayuda="Cotiza" elegido etiqueta="Recomendado" icono="storefront" onPress={onPress} testID="t" />);
    const t = screen.getByRole("radio", { name: "Vendo productos" });
    expect(t.props.accessibilityState).toEqual({ selected: true, checked: true, disabled: false });
    expect(t.props.accessibilityHint).toBe("Recomendado. Cotiza");
    expect(screen.getByText("Recomendado", { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(t);
    expect(onPress).toHaveBeenCalled();
  });

  it("deshabilitada no responde, muestra su nota y su acción", async () => {
    const onPress = jest.fn();
    await render(
      <Elegible
        titulo="Ventas"
        elegido={false}
        deshabilitado
        nota="Ya tienes un agente «Ventas»: edítalo en vez de crear otro."
        accion={<Text>Editar a Laura</Text>}
        onPress={onPress}
        testID="v"
      />,
    );
    const t = screen.getByTestId("v");
    expect(t.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId("v-nota")).toBeTruthy();
    expect(screen.getByText("Editar a Laura")).toBeTruthy();
    await fireEvent.press(t);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("el chip lleva la inicial y, elegido, la palomita", async () => {
    const { rerender } = await render(<Chip titulo="Sofía" inicial="S" rol="radio" elegido={false} onPress={jest.fn()} />);
    expect(screen.getByText("S")).toBeTruthy();
    await rerender(<Chip titulo="Sofía" inicial="S" rol="radio" elegido onPress={jest.fn()} />);
    expect(screen.queryByText("S")).toBeNull();
    expect(screen.getByRole("radio", { name: "Sofía" }).props.accessibilityState.selected).toBe(true);
  });
});
