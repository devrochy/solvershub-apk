import { render } from "@testing-library/react-native";
import { Animated } from "react-native";
import { ColorBadge, colorDeEstado } from "./ColorBadge";
import { kitDeTema } from "@shared/ui";

describe("ColorBadge", () => {
  it("renderiza un punto circular con el color semántico", async () => {
    const { getByTestId } = await render(<ColorBadge color="rojo" />);
    const punto = getByTestId("color-badge-rojo");
    expect(punto).toBeTruthy();
    expect(punto).toHaveStyle({ backgroundColor: kitDeTema("claro").tonos.danger.fg });
  });

  it("los estados del cliente salen de los tonos del kit (HU-DS-10)", () => {
    const { tonos } = kitDeTema("claro");
    expect(colorDeEstado("verde")).toBe(tonos.success.fg);
    expect(colorDeEstado("rojo")).toBe(tonos.danger.fg);
    expect(colorDeEstado("azul")).toBe(tonos.info.fg);
    expect(colorDeEstado("blanco")).toBe(tonos.neutral.fg);
    expect(colorDeEstado("otro")).toBe(tonos.neutral.fg);
    expect(colorDeEstado("rojo", "oscuro")).toBe(kitDeTema("oscuro").tonos.danger.fg);
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
