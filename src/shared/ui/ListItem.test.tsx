import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity } from "@core/theme/tokens";
import { Badge } from "./Badge";
import { ListItem, RecordRow } from "./ListItem";
import { areaTactil } from "./test-utils";

describe("ListItem (kit)", () => {
  it("fila táctil: rol botón con nombre compuesto, chevron y ≥ 48 dp", async () => {
    const onPress = jest.fn();
    await render(
      <ListItem
        title="Laura Martínez"
        subtitle="Calle 10 # 4-21"
        meta="Visita 9:30"
        badge={<Badge tone="danger" icon="error-outline" label="En mora" />}
        onPress={onPress}
      />,
    );

    const fila = screen.getByRole("button", { name: "Laura Martínez, Calle 10 # 4-21, Visita 9:30" });
    expect(screen.getByText("En mora")).toBeTruthy();
    expect(screen.getByTestId("icono-chevron-right")).toBeTruthy();
    expect(areaTactil(fila).alto).toBeGreaterThanOrEqual(shDensity.rowComfortable);
    await fireEvent.press(fila);
    expect(onPress).toHaveBeenCalled();
  });

  it("sin onPress no es un botón ni lleva chevron", async () => {
    await render(<ListItem title="Solo lectura" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("icono-chevron-right")).toBeNull();
  });

  it("selected y disabled van al estado accesible", async () => {
    await render(<ListItem title="Cartera Norte" onPress={jest.fn()} selected disabled />);
    const fila = screen.getByRole("button", { name: "Cartera Norte" });
    expect(fila).toBeSelected();
    expect(fila).toBeDisabled();
    expect(screen.getByTestId("list-item-indicador")).toBeTruthy();
  });
});

describe("RecordRow (kit)", () => {
  it("muestra el valor con cifras tabulares y escalado limitado, y lo incluye en el nombre", async () => {
    await render(<RecordRow title="Pago cuota 3" subtitle="Laura Martínez" value="$ 120.000" onPress={jest.fn()} />);
    const valor = screen.getByText("$ 120.000");
    expect(valor).toHaveStyle({ fontVariant: ["tabular-nums"] });
    expect(valor.props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.6);
    expect(screen.getByRole("button", { name: "Pago cuota 3, Laura Martínez, $ 120.000" })).toBeTruthy();
  });
});
