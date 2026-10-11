import { fireEvent, render, screen } from "@testing-library/react-native";
import { IconButton } from "./IconButton";
import { areaTactil } from "./test-utils";

describe("IconButton (kit)", () => {
  it("usa el label obligatorio como nombre accesible", async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="close" label="Cerrar" onPress={onPress} />);

    const boton = screen.getByRole("button", { name: "Cerrar" });
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByTestId("icono-close")).toBeTruthy();
  });

  it.each(["sm", "md", "lg"] as const)("el tamaño %s mide al menos 48 × 48 dp", async (size) => {
    await render(<IconButton icon="edit" label="Editar" size={size} />);
    const { alto, ancho } = areaTactil(screen.getByRole("button"));
    expect(alto).toBeGreaterThanOrEqual(48);
    expect(ancho).toBeGreaterThanOrEqual(48);
  });

  it("expone disabled y selected en el estado accesible", async () => {
    await render(<IconButton icon="star" label="Favorito" disabled selected />);
    const boton = screen.getByRole("button", { name: "Favorito" });
    expect(boton).toBeDisabled();
    expect(boton).toBeSelected();
  });
});
