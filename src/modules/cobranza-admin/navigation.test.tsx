import { render } from "@testing-library/react-native";
import { TituloConPadre } from "./navigation";

describe("header de la ficha del cliente (HU-UX-12)", () => {
  it("muestra la cartera como padre sobre el nombre del cliente", async () => {
    const { getByTestId, getByText } = await render(<TituloConPadre padre="Cobranza Demo" titulo="Juana Perez" />);
    expect(getByText("Cobranza Demo")).toBeTruthy();
    expect(getByText("Juana Perez")).toBeTruthy();
    expect(getByTestId("cliente-header-titulo").props.accessibilityLabel).toBe("Cobranza Demo, Juana Perez");
  });
});
