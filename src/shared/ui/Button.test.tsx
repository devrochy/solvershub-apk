import { fireEvent, render, screen } from "@testing-library/react-native";
import { shDensity, shTheme, shType } from "@core/theme/tokens";
import { Button } from "./Button";
import { areaTactil } from "./test-utils";

describe("Button (kit)", () => {
  it("anuncia rol botón y su nombre, y responde al toque", async () => {
    const onPress = jest.fn();
    await render(<Button onPress={onPress}>Guardar</Button>);

    const boton = screen.getByRole("button", { name: "Guardar" });
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(["primary", "secondary", "ghost", "danger", "link"] as const)(
    "la variante %s mide al menos 48 × 48 dp",
    async (variant) => {
      await render(<Button variant={variant}>Ir</Button>);
      const { alto, ancho } = areaTactil(screen.getByRole("button"));
      expect(alto).toBeGreaterThanOrEqual(shDensity.controlLg);
      expect(ancho).toBeGreaterThanOrEqual(shDensity.controlLg);
    },
  );

  it.each(["sm", "md", "lg"] as const)("el tamaño %s conserva el blanco táctil de 48 dp", async (size) => {
    await render(<Button size={size}>Ir</Button>);
    expect(areaTactil(screen.getByRole("button")).alto).toBeGreaterThanOrEqual(48);
  });

  it("loading: queda ocupado y deshabilitado, muestra el spinner y conserva el texto (ancho)", async () => {
    const onPress = jest.fn();
    await render(
      <Button loading onPress={onPress} testID="guardar">
        Guardar
      </Button>,
    );

    const boton = screen.getByRole("button", { name: "Guardar" });
    expect(boton).toBeBusy();
    expect(boton).toBeDisabled();
    expect(screen.getByTestId("guardar-cargando")).toBeTruthy();
    // El texto sigue montado (invisible) para que el botón no cambie de ancho.
    expect(screen.getByText("Guardar")).toBeTruthy();
    await fireEvent.press(boton);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("disabled: estado accesible y colores de deshabilitado sin opacidad sobre el texto", async () => {
    await render(<Button disabled>Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    expect(screen.getByText("Enviar")).toHaveStyle({ color: shTheme.light.textSoft });
  });

  it("muestra los íconos izquierdo y derecho sin que entren al nombre accesible", async () => {
    await render(
      <Button iconLeft="add" iconRight="chevron-right">
        Nuevo cliente
      </Button>,
    );
    expect(screen.getByTestId("icono-add")).toBeTruthy();
    expect(screen.getByTestId("icono-chevron-right")).toBeTruthy();
    expect(screen.getByRole("button")).toHaveAccessibleName("Nuevo cliente");
  });

  it("usa la tipografía de marca (Inter) y nunca Roboto", async () => {
    await render(<Button>Ir</Button>);
    const estilo = screen.getByText("Ir");
    expect(estilo).toHaveStyle({ fontFamily: shType.label.fontFamily });
  });
});
