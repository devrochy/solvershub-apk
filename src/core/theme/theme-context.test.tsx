import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";
import { ThemeProvider, useTheme } from "./theme-context";

function Probe() {
  const { tema, alternarTema } = useTheme();
  return (
    <Pressable testID="toggle" onPress={alternarTema}>
      <Text testID="tema">{tema}</Text>
    </Pressable>
  );
}

describe("ThemeProvider", () => {
  it("alterna entre claro y oscuro", async () => {
    const { getByTestId } = await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(getByTestId("tema").props.children).toBe("claro");

    await fireEvent.press(getByTestId("toggle"));
    expect(getByTestId("tema").props.children).toBe("oscuro");

    await fireEvent.press(getByTestId("toggle"));
    expect(getByTestId("tema").props.children).toBe("claro");
  });
});
