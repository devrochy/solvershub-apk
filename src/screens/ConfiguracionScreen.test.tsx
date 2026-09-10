import { render } from "@testing-library/react-native";
import { ConfiguracionScreen } from "./ConfiguracionScreen";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { name: "CobraIA", version: "1.0.0" } },
}));

describe("ConfiguracionScreen", () => {
  it("muestra el nombre y la versión de la app", async () => {
    const { getByTestId } = await render(<ConfiguracionScreen />);

    expect(getByTestId("config-app").props.children).toBe("CobraIA");
    expect(getByTestId("config-version").props.children).toBe("1.0.0");
  });
});
