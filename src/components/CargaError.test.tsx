import { fireEvent, render } from "@testing-library/react-native";
import { CargaError } from "./CargaError";

describe("CargaError", () => {
  it("muestra un spinner mientras carga", async () => {
    const { getByTestId } = await render(
      <CargaError cargando error={null} onReintentar={jest.fn()} />,
    );
    expect(getByTestId("carga-spinner")).toBeTruthy();
  });

  it("muestra el error y el botón de reintentar", async () => {
    const onReintentar = jest.fn();
    const { getByText, getByTestId } = await render(
      <CargaError
        cargando={false}
        error="Algo salió mal"
        onReintentar={onReintentar}
      />,
    );

    expect(getByText("Algo salió mal")).toBeTruthy();
    await fireEvent.press(getByTestId("reintentar"));
    expect(onReintentar).toHaveBeenCalled();
  });

  it("no renderiza nada si no carga ni hay error", async () => {
    const { toJSON } = await render(
      <CargaError cargando={false} error={null} onReintentar={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });
});