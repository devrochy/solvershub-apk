import { render } from "@testing-library/react-native";
import { Avatar, inicialesDe } from "./Avatar";

describe("inicialesDe", () => {
  it("extrae iniciales de la primera y última palabra", () => {
    expect(inicialesDe("Laura Martínez")).toBe("LM");
  });

  it("usa una sola inicial si hay un solo nombre", () => {
    expect(inicialesDe("Laura")).toBe("L");
  });

  it("devuelve ? si el nombre está vacío", () => {
    expect(inicialesDe("   ")).toBe("?");
  });
});

describe("Avatar", () => {
  it("muestra la foto si fotoUrl está presente", async () => {
    const { getByTestId, queryByTestId } = await render(
      <Avatar nombre="Laura" fotoUrl="https://cdn.test/f.jpg" />,
    );
    expect(getByTestId("avatar-foto")).toBeTruthy();
    expect(queryByTestId("avatar-iniciales")).toBeNull();
  });

  it("muestra iniciales si no hay foto", async () => {
    const { getByTestId, getByText } = await render(<Avatar nombre="Laura Martínez" />);
    expect(getByTestId("avatar-iniciales")).toBeTruthy();
    expect(getByText("LM")).toBeTruthy();
  });
});