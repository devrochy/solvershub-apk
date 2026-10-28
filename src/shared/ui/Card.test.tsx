import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import { Card } from "./Card";

describe("Card", () => {
  it("renderiza su contenido con el rol de botón cuando se puede tocar", async () => {
    const onPress = jest.fn();
    const { getByTestId, getByText } = await render(
      <Card testID="tarjeta" onPress={onPress} accessibilityLabel="Cliente Juana">
        <Text>Juana</Text>
      </Card>,
    );
    expect(getByText("Juana")).toBeTruthy();
    expect(getByTestId("tarjeta").props.accessibilityRole).toBe("button");
    await fireEvent.press(getByTestId("tarjeta"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("sin onPress no es un botón", async () => {
    const { getByTestId } = await render(
      <Card testID="tarjeta">
        <Text>Contenido</Text>
      </Card>,
    );
    expect(getByTestId("tarjeta").props.accessibilityRole).toBeUndefined();
  });
});
