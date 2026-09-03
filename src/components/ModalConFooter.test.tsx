import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { ModalConFooter } from "./ModalConFooter";

describe("ModalConFooter", () => {
  it("renderiza header con título, botón de cerrar, cuerpo y footer", async () => {
    const onCerrar = jest.fn();
    const { getByTestId, getByText } = await render(
      <ModalConFooter
        visible
        titulo="Editar cliente"
        onCerrar={onCerrar}
        onCancelar={jest.fn()}
        onConfirmar={jest.fn()}
      >
        <Text>Cuerpo del modal</Text>
      </ModalConFooter>,
    );

    expect(getByText("Editar cliente")).toBeTruthy();
    expect(getByText("Cuerpo del modal")).toBeTruthy();
    expect(getByTestId("modal-cerrar")).toBeTruthy();
    expect(getByTestId("modal-cancelar")).toBeTruthy();
    expect(getByTestId("modal-confirmar")).toBeTruthy();
  });

  it("no renderiza nada si visible es false", async () => {
    const { queryByTestId } = await render(
      <ModalConFooter
        visible={false}
        titulo="Editar cliente"
        onCerrar={jest.fn()}
        onCancelar={jest.fn()}
        onConfirmar={jest.fn()}
      >
        <Text>Cuerpo</Text>
      </ModalConFooter>,
    );

    expect(queryByTestId("modal-cerrar")).toBeNull();
    expect(queryByTestId("modal-cancelar")).toBeNull();
  });

  it("llama onCerrar al tocar el botón de cerrar", async () => {
    const onCerrar = jest.fn();
    const { getByTestId } = await render(
      <ModalConFooter
        visible
        titulo="Editar"
        onCerrar={onCerrar}
        onCancelar={jest.fn()}
      >
        <Text>Cuerpo</Text>
      </ModalConFooter>,
    );

    await fireEvent.press(getByTestId("modal-cerrar"));
    expect(onCerrar).toHaveBeenCalled();
  });

  it("llama onCancelar y onConfirmar desde el footer", async () => {
    const onCancelar = jest.fn();
    const onConfirmar = jest.fn();
    const { getByTestId } = await render(
      <ModalConFooter
        visible
        titulo="Editar"
        onCerrar={jest.fn()}
        onCancelar={onCancelar}
        onConfirmar={onConfirmar}
      >
        <Text>Cuerpo</Text>
      </ModalConFooter>,
    );

    await fireEvent.press(getByTestId("modal-cancelar"));
    expect(onCancelar).toHaveBeenCalled();
    await fireEvent.press(getByTestId("modal-confirmar"));
    expect(onConfirmar).toHaveBeenCalled();
  });

  it("no renderiza el footer si no hay acciones", async () => {
    const { queryByTestId } = await render(
      <ModalConFooter visible titulo="Detalle" onCerrar={jest.fn()}>
        <Text>Cuerpo</Text>
      </ModalConFooter>,
    );

    expect(queryByTestId("modal-cancelar")).toBeNull();
    expect(queryByTestId("modal-confirmar")).toBeNull();
  });
});