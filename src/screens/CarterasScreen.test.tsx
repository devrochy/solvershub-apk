import { fireEvent, render } from "@testing-library/react-native";
import { CarterasScreen } from "./CarterasScreen";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock("./SeleccionCarteraScreen", () => {
  const { Pressable, Text } = jest.requireActual("react-native");
  return {
    SeleccionCarteraScreen: ({
      onCarteraSeleccionada,
    }: {
      onCarteraSeleccionada?: () => void;
    }) => (
      <Pressable testID="elegir-cartera" onPress={onCarteraSeleccionada}>
        <Text>elegir</Text>
      </Pressable>
    ),
  };
});

describe("CarterasScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("abre el flujo de cartera al seleccionar una cartera", async () => {
    const { getByTestId } = await render(<CarterasScreen />);

    await fireEvent.press(getByTestId("elegir-cartera"));

    expect(mockNavigate).toHaveBeenCalledWith("Cartera");
  });
});
