import { render } from "@testing-library/react-native";
import { ColorBadge } from "./ColorBadge";

describe("ColorBadge", () => {
  it("renderiza un punto circular con el color semántico", async () => {
    const { getByTestId } = await render(<ColorBadge color="rojo" />);
    const punto = getByTestId("color-badge-rojo");
    expect(punto).toBeTruthy();
    expect(punto.props.style[1].backgroundColor).toBe("#dc2626");
  });

  it("no muestra texto del color", async () => {
    const { queryByText } = await render(<ColorBadge color="azul" label="azul" />);
    expect(queryByText("azul")).toBeNull();
  });
});