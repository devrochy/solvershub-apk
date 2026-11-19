import { fireEvent, render, screen } from "@testing-library/react-native";
import { BarraRecomendado } from "./BarraRecomendado";

describe("BarraRecomendado (kit, HU-APP-23)", () => {
  it("sin cambios solo dice que viene con lo recomendado", async () => {
    await render(<BarraRecomendado cambios={0} onUsar={jest.fn()} />);
    expect(screen.getByText(/Todo viene con lo recomendado por SolversHub/)).toBeTruthy();
    expect(screen.queryByText("Usar lo recomendado")).toBeNull();
  });

  it("con cambios dice cuántos y ofrece volver a lo recomendado", async () => {
    const onUsar = jest.fn();
    await render(<BarraRecomendado cambios={2} onUsar={onUsar} testID="b" />);
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("b-usar"));
    expect(onUsar).toHaveBeenCalled();
  });
});
