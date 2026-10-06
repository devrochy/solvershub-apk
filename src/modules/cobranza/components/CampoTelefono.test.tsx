import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { CampoTelefono } from "./CampoTelefono";

describe("CampoTelefono", () => {
  it("muestra la bandera y el prefijo del país actual", async () => {
    const { getByTestId, getByText } = await render(
      <CampoTelefono valor="+5917000111" onChange={jest.fn()} />,
    );

    expect(getByText("🇧🇴")).toBeTruthy();
    expect(getByText("+591")).toBeTruthy();
    expect(getByTestId("campo-telefono-numero").props.value).toBe("7000111");
  });

  it("al escribir el número emite el número internacional completo", async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <CampoTelefono valor="+591" onChange={onChange} />,
    );

    await fireEvent.changeText(getByTestId("campo-telefono-numero"), "7000111");

    expect(onChange).toHaveBeenCalledWith("+5917000111");
  });

  it("abre la lista de países y al seleccionar uno cambia el prefijo", async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await render(
      <CampoTelefono valor="+5917000111" onChange={onChange} />,
    );

    await fireEvent.press(getByTestId("campo-telefono-pais"));
    await waitFor(() => expect(getByText("Colombia")).toBeTruthy());
    await fireEvent.press(getByTestId("campo-telefono-pais-CO"));

    expect(onChange).toHaveBeenCalledWith("+577000111");
  });
});