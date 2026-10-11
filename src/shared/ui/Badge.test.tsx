import { render, screen } from "@testing-library/react-native";
import { shTheme } from "@core/theme/tokens";
import { Badge } from "./Badge";

describe("Badge (kit)", () => {
  it("neutral sin ícono: solo texto", async () => {
    await render(<Badge label="Borrador" />);
    expect(screen.getByText("Borrador")).toBeTruthy();
    expect(screen.getByLabelText("Borrador")).toBeTruthy();
  });

  it.each([
    ["success", "statusSuccessFg"],
    ["warning", "statusWarningFg"],
    ["danger", "statusDangerFg"],
    ["info", "statusInfoFg"],
  ] as const)("el tono %s usa el color de estado del tema y lleva su ícono", async (tone, token) => {
    await render(<Badge tone={tone} icon="check-circle" label="Estado" />);
    expect(screen.getByText("Estado")).toHaveStyle({ color: shTheme.light[token] });
    expect(screen.getByTestId("icono-check-circle")).toBeTruthy();
  });

  it("acepta el tono accent con ícono opcional", async () => {
    await render(<Badge tone="accent" label="Nuevo" />);
    expect(screen.getByText("Nuevo")).toBeTruthy();
  });

  it("limita el escalado de fuente (cifra densa)", async () => {
    await render(<Badge label="3" />);
    expect(screen.getByText("3").props.maxFontSizeMultiplier).toBeLessThanOrEqual(1.6);
  });
});
