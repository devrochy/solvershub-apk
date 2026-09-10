import { fireEvent, render } from "@testing-library/react-native";
import { RutasScreen } from "./RutasScreen";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("./SeleccionRutaScreen", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    SeleccionRutaScreen: ({
      onRutaSeleccionada,
    }: {
      onRutaSeleccionada?: () => void;
    }) => (
      <Pressable testID="elegir-ruta" onPress={onRutaSeleccionada}>
        <Text>elegir</Text>
      </Pressable>
    ),
  };
});

describe("RutasScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("abre el flujo de ruta al seleccionar una ruta", async () => {
    const { getByTestId } = await render(<RutasScreen />);

    await fireEvent.press(getByTestId("elegir-ruta"));

    expect(mockNavigate).toHaveBeenCalledWith("Ruta");
  });
});
