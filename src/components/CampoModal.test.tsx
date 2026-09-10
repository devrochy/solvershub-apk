import { fireEvent, render } from "@testing-library/react-native";
import { CampoModal } from "./CampoModal";

describe("CampoModal", () => {
  it("renderiza la etiqueta y el input con su testID", async () => {
    const { getByText, getByTestId } = await render(
      <CampoModal label="Descripción" testID="campo-descripcion" />,
    );

    expect(getByText("Descripción")).toBeTruthy();
    expect(getByTestId("campo-descripcion")).toBeTruthy();
  });

  it("propaga el cambio de texto del input", async () => {
    const onChangeText = jest.fn();
    const { getByTestId } = await render(
      <CampoModal testID="campo-valor" onChangeText={onChangeText} />,
    );

    await fireEvent.changeText(getByTestId("campo-valor"), "50");
    expect(onChangeText).toHaveBeenCalledWith("50");
  });

  it("no renderiza etiqueta si no se pasa label", async () => {
    const { queryByText, getByTestId } = await render(
      <CampoModal testID="solo-input" placeholder="Valor" />,
    );

    expect(getByTestId("solo-input")).toBeTruthy();
    expect(queryByText("Descripción")).toBeNull();
  });
});
