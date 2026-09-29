import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import { ColorBadge } from "./ColorBadge";
import { shColor } from "../theme/tokens";

describe("ColorBadge", () => {
  it("renderiza un punto circular con el color semántico", async () => {
    const { getByTestId } = await render(<ColorBadge color="rojo" />);
    const punto = getByTestId("color-badge-rojo");
    expect(punto).toBeTruthy();
    expect(punto).toHaveStyle({ backgroundColor: shColor.danger });
  });

  it("no muestra texto del color", async () => {
    const { queryByText } = await render(<ColorBadge color="azul" label="azul" />);
    expect(queryByText("azul")).toBeNull();
  });

  it("con animar inicia el bucle de titileo", async () => {
    const loopSpy = jest
      .spyOn(Animated, "loop")
      .mockReturnValue({ start: jest.fn(), stop: jest.fn() } as never);

    await render(<ColorBadge color="verde" animar />);

    expect(loopSpy).toHaveBeenCalled();
    loopSpy.mockRestore();
  });

  it("sin animar no inicia el titileo", async () => {
    const loopSpy = jest
      .spyOn(Animated, "loop")
      .mockReturnValue({ start: jest.fn(), stop: jest.fn() } as never);

    await render(<ColorBadge color="verde" />);

    expect(loopSpy).not.toHaveBeenCalled();
    loopSpy.mockRestore();
  });
});
