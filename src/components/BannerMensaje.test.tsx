import { render } from "@testing-library/react-native";
import { BannerMensaje } from "./BannerMensaje";

describe("BannerMensaje", () => {
  it("usa fondo verde cuando es un mensaje de éxito", async () => {
    const { getByTestId, getByText } = await render(
      <BannerMensaje texto="Pago registrado." tipo="exito" />,
    );

    expect(getByText("Pago registrado.")).toBeTruthy();
    expect(getByTestId("banner-mensaje")).toHaveStyle({ backgroundColor: "#f0fdf4" });
  });

  it("usa fondo rojo cuando es un mensaje de error", async () => {
    const { getByTestId, getByText } = await render(
      <BannerMensaje texto="No se pudo registrar el pago." tipo="error" />,
    );

    expect(getByText("No se pudo registrar el pago.")).toBeTruthy();
    expect(getByTestId("banner-mensaje")).toHaveStyle({ backgroundColor: "#fef2f2" });
  });
});
