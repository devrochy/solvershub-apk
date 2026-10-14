import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { CLAVE_TEMA, TEMA_POR_DEFECTO, ThemeProvider, useTheme } from "./theme-context";

function Probe() {
  const { tema, alternarTema } = useTheme();
  return (
    <Pressable testID="toggle" onPress={alternarTema}>
      <Text testID="tema">{tema}</Text>
    </Pressable>
  );
}

describe("ThemeProvider", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it("arranca en oscuro, como el panel web, y no escribe nada al hidratar", async () => {
    expect(TEMA_POR_DEFECTO).toBe("oscuro");
    const { getByTestId } = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("tema").props.children).toBe("oscuro");
    await act(async () => undefined);
    expect(getByTestId("tema").props.children).toBe("oscuro");
    expect(await AsyncStorage.getItem(CLAVE_TEMA)).toBeNull();
  });

  it("respeta el tema que el usuario ya había elegido", async () => {
    await AsyncStorage.setItem(CLAVE_TEMA, "claro");
    const { getByTestId } = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await waitFor(() => expect(getByTestId("tema").props.children).toBe("claro"));
  });

  it("alterna entre oscuro y claro y persiste la elección", async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await fireEvent.press(getByTestId("toggle"));
    expect(getByTestId("tema").props.children).toBe("claro");
    await waitFor(async () => expect(await AsyncStorage.getItem(CLAVE_TEMA)).toBe("claro"));

    await fireEvent.press(getByTestId("toggle"));
    expect(getByTestId("tema").props.children).toBe("oscuro");
    await waitFor(async () => expect(await AsyncStorage.getItem(CLAVE_TEMA)).toBe("oscuro"));
  });
});
