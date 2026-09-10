import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { VentanaCerrarConSwipe } from "./VentanaCerrarConSwipe";

describe("VentanaCerrarConSwipe", () => {
  it("renderiza su contenido", async () => {
    const { getByText } = await render(
      <VentanaCerrarConSwipe onCerrar={jest.fn()}>
        <Text>Contenido</Text>
      </VentanaCerrarConSwipe>,
    );

    expect(getByText("Contenido")).toBeTruthy();
  });

  it("su raíz recibe los handlers del responder para el gesto de cerrar", async () => {
    const { getByTestId } = await render(
      <VentanaCerrarConSwipe testID="ventana" onCerrar={jest.fn()}>
        <Text>Contenido</Text>
      </VentanaCerrarConSwipe>,
    );

    const raiz = getByTestId("ventana");
    const props = raiz.props as {
      onMoveShouldSetResponder?: unknown;
      onResponderRelease?: unknown;
      onResponderTerminate?: unknown;
    };

    expect(props.onMoveShouldSetResponder).toBeDefined();
    expect(props.onResponderRelease).toBeDefined();
    expect(props.onResponderTerminate).toBeDefined();
  });

  it("expone el responder del gesto sin disparar onCerrar antes del release", async () => {
    const onCerrar = jest.fn();
    const { getByTestId } = await render(
      <VentanaCerrarConSwipe testID="ventana" onCerrar={onCerrar}>
        <Text>Contenido</Text>
      </VentanaCerrarConSwipe>,
    );

    const raiz = getByTestId("ventana");
    const props = raiz.props as {
      onResponderRelease?: (e: unknown) => void;
    };

    expect(props.onResponderRelease).toBeDefined();
    expect(onCerrar).not.toHaveBeenCalled();
  });
});