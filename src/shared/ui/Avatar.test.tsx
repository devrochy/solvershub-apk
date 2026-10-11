import { fireEvent, render, screen } from "@testing-library/react-native";
import { Avatar, iniciales } from "./Avatar";

describe("iniciales", () => {
  it.each([
    ["Laura Martínez", "LM"],
    ["laura martínez gómez", "LM"],
    ["  Pedro  ", "P"],
    ["", "?"],
  ])("%p → %p", (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });
});

describe("Avatar (kit)", () => {
  it("sin imagen muestra las iniciales y anuncia el nombre como imagen", async () => {
    await render(<Avatar name="Laura Martínez" />);
    expect(screen.getByText("LM")).toBeTruthy();
    expect(screen.getByRole("image", { name: "Laura Martínez" })).toBeTruthy();
  });

  it("con imagen la muestra y, si falla, cae a las iniciales", async () => {
    await render(<Avatar name="Laura Martínez" src="https://cdn.test/f.jpg" />);
    const foto = screen.getByTestId("avatar-imagen");
    await fireEvent(foto, "error");
    expect(screen.queryByTestId("avatar-imagen")).toBeNull();
    expect(screen.getByText("LM")).toBeTruthy();
  });

  it.each([
    ["xs", 24],
    ["sm", 32],
    ["md", 40],
    ["lg", 56],
  ] as const)("tamaño %s = %i dp", async (size, dp) => {
    await render(<Avatar name="Ana" size={size} testID="av" />);
    expect(screen.getByTestId("av")).toHaveStyle({ width: dp, height: dp });
  });

  it("el estado opcional se dice con texto, no solo con el punto de color", async () => {
    await render(<Avatar name="Ana Ruiz" status={{ tone: "success", label: "En ruta" }} />);
    expect(screen.getByTestId("avatar-estado")).toBeTruthy();
    expect(screen.getByRole("image", { name: "Ana Ruiz, En ruta" })).toBeTruthy();
  });
});
