import { fireEvent, render, screen } from "@testing-library/react-native";
import { CatalogoScreen } from "./CatalogoScreen";

describe("CatalogoScreen (HU-DS-09)", () => {
  it("muestra cada componente del kit con sus variantes", async () => {
    await render(<CatalogoScreen />);

    for (const seccion of [
      "Button",
      "IconButton",
      "Field + TextField",
      "Badge",
      "Stepper y controles",
      "Avatar",
      "Skeleton",
      "KpiTile",
      "ListItem / RecordRow",
      "SyncStatus",
      "EmptyState",
      "Toast y Sheet",
    ]) {
      expect(screen.getByRole("header", { name: seccion })).toBeTruthy();
    }
    expect(screen.getByText("Paso 3 de 4")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Soporte" }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByText("Sin conexión · 3 cambios por enviar")).toBeTruthy();
    expect(screen.getByText("+12 % frente a los 7 días anteriores")).toBeTruthy();
  });

  it("dispara un toast y abre la hoja de ejemplo", async () => {
    await render(<CatalogoScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Toast de éxito" }));
    expect(screen.getByRole("status")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Abrir Sheet" }));
    expect(screen.getByRole("header", { name: "Registrar pago" })).toBeTruthy();
  });
});
