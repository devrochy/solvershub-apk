import { fireEvent, render, screen } from "@testing-library/react-native";
import { Sparkline } from "./Sparkline";

const medir = (testID: string, ancho = 300) =>
  fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), "layout", {
    nativeEvent: { layout: { width: ancho, height: 40, x: 0, y: 0 } },
  });

describe("Sparkline (kit)", () => {
  it("sin etiqueta es decorativa: no se anuncia", async () => {
    await render(<Sparkline testID="spark" values={[1, 3, 2]} color="#22C7E0" fondo="#11224D" />);
    expect(screen.queryByTestId("spark")).toBeNull();
    expect(screen.getByTestId("spark", { includeHiddenElements: true })).toBeTruthy();
  });

  it("con etiqueta va sola y se anuncia como imagen", async () => {
    await render(
      <Sparkline testID="spark" values={[1, 3, 2]} color="#22C7E0" fondo="#11224D" label="Conversaciones por día" />,
    );
    expect(screen.getByLabelText("Conversaciones por día")).toBeTruthy();
    expect(screen.getByTestId("spark")).toHaveProp("accessibilityRole", "image");
  });

  it("dibuja la línea y el punto final cuando conoce su ancho; una serie plana no falla", async () => {
    await render(<Sparkline testID="spark" values={[2, 2, 2]} color="#22C7E0" fondo="#11224D" area label="x" />);
    const antes = JSON.stringify(screen.toJSON());
    await medir("spark");
    const despues = JSON.stringify(screen.toJSON());
    expect(despues).toContain("RNSVGPath");
    expect(despues).toContain("RNSVGCircle");
    expect(antes).not.toContain("RNSVGPath");
  });

  it("sin datos no dibuja nada", async () => {
    await render(<Sparkline testID="spark" values={[null, null]} color="#22C7E0" fondo="#11224D" label="x" />);
    await medir("spark");
    expect(JSON.stringify(screen.toJSON())).not.toContain("RNSVGPath");
  });
});
