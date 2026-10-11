import { fireEvent, render, screen } from "@testing-library/react-native";
import { shTheme } from "@core/theme/tokens";
import { formatearDelta, KpiTile } from "./KpiTile";

describe("formatearDelta", () => {
  it.each([
    [12, "frente a los 7 días anteriores", "+12 % frente a los 7 días anteriores"],
    [-3.5, undefined, "−3,5 %"],
    [0, "frente a ayer", "Sin cambio frente a ayer"],
  ])("%p %p → %p", (delta, periodo, esperado) => {
    expect(formatearDelta(delta, periodo)).toBe(esperado);
  });
});

describe("KpiTile (kit)", () => {
  it("escribe el delta con flecha; el color es secundario (up-good → éxito)", async () => {
    await render(<KpiTile label="Recaudo" value="$ 1.250.000" delta={12} period="frente a los 7 días anteriores" />);

    expect(screen.getByText("$ 1.250.000")).toHaveStyle({ fontVariant: ["tabular-nums"] });
    const delta = screen.getByText("+12 % frente a los 7 días anteriores");
    expect(delta).toHaveStyle({ color: shTheme.light.statusSuccessFg });
    expect(screen.getByTestId("icono-arrow-upward")).toBeTruthy();
    expect(
      screen.getByLabelText("Recaudo: $ 1.250.000. Sube 12 % frente a los 7 días anteriores"),
    ).toBeTruthy();
  });

  it("polarity up-bad: una subida es desfavorable (peligro)", async () => {
    await render(<KpiTile label="En mora" value="14" delta={8} polarity="up-bad" />);
    expect(screen.getByText("+8 %")).toHaveStyle({ color: shTheme.light.statusDangerFg });
  });

  it("una bajada con up-bad es favorable y usa la flecha hacia abajo", async () => {
    await render(<KpiTile label="En mora" value="10" delta={-20} polarity="up-bad" />);
    expect(screen.getByText("−20 %")).toHaveStyle({ color: shTheme.light.statusSuccessFg });
    expect(screen.getByTestId("icono-arrow-downward")).toBeTruthy();
    expect(screen.getByLabelText("En mora: 10. Baja 20 %")).toBeTruthy();
  });

  it("limita el escalado de la cifra a 1,6×", async () => {
    await render(<KpiTile label="Clientes" value="128" />);
    expect(screen.getByText("128").props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.6);
  });

  it("loading: esqueleto en vez de cifra y estado ocupado", async () => {
    await render(<KpiTile label="Recaudo" value="$ 0" loading testID="kpi" />);
    expect(screen.queryByText("$ 0")).toBeNull();
    expect(screen.getByTestId("kpi")).toBeBusy();
    expect(screen.getByLabelText("Recaudo: cargando")).toBeTruthy();
  });

  it("onPress: es un botón", async () => {
    const onPress = jest.fn();
    await render(<KpiTile label="Clientes" value="128" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Clientes: 128" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("error: dice qué pasó, con ícono", async () => {
    await render(<KpiTile label="Recaudo" value="" error="No se pudo cargar" />);
    expect(screen.getByText("No se pudo cargar")).toBeTruthy();
    expect(screen.getByTestId("icono-error-outline")).toBeTruthy();
  });
});
