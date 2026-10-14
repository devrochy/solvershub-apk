import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { NavGroup } from "./NavGroup";
import { areaTactil } from "./test-utils";

describe("NavGroup", () => {
  it("plegado no monta los hijos; abierto sí, y anuncia el estado", async () => {
    const onToggle = jest.fn();
    const { getByTestId, queryByText, rerender } = await render(
      <NavGroup testID="grupo" label="Cobranza" icon="payments" abierto={false} onToggle={onToggle}>
        <Text>Gestores</Text>
      </NavGroup>,
    );
    expect(queryByText("Gestores")).toBeNull();
    expect(getByTestId("grupo")).toHaveProp("accessibilityState", { expanded: false, disabled: false });
    expect(getByTestId("icono-chevron-right")).toBeTruthy();
    expect(areaTactil(getByTestId("grupo")).alto).toBeGreaterThanOrEqual(48);

    await fireEvent.press(getByTestId("grupo"));
    expect(onToggle).toHaveBeenCalledTimes(1);

    await rerender(
      <NavGroup testID="grupo" label="Cobranza" icon="payments" abierto onToggle={onToggle}>
        <Text>Gestores</Text>
      </NavGroup>,
    );
    expect(queryByText("Gestores")).toBeTruthy();
    expect(getByTestId("grupo")).toHaveProp("accessibilityState", { expanded: true, disabled: false });
    expect(getByTestId("icono-expand-more")).toBeTruthy();
  });

  it("bloqueado muestra el candado, no se despliega y queda deshabilitado", async () => {
    const onToggle = jest.fn();
    const { getByTestId, queryByText } = await render(
      <NavGroup testID="grupo" label="Comercio" abierto bloqueado onToggle={onToggle}>
        <Text>Productos</Text>
      </NavGroup>,
    );
    expect(getByTestId("icono-lock")).toBeTruthy();
    expect(queryByText("Productos")).toBeNull();
    expect(getByTestId("grupo")).toHaveProp("accessibilityState", { expanded: false, disabled: true });
    await fireEvent.press(getByTestId("grupo"));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
