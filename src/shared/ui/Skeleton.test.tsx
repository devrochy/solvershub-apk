import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Skeleton } from "./Skeleton";

describe("Skeleton (kit)", () => {
  it("text pinta una barra por línea y queda oculto al lector de pantalla", async () => {
    await render(<Skeleton shape="text" lines={3} testID="sk" />);
    const contenedor = screen.getByTestId("sk", { includeHiddenElements: true });
    expect(contenedor.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(screen.getAllByTestId("sk-linea", { includeHiddenElements: true })).toHaveLength(3);
  });

  it("circle usa el mismo ancho y alto con radio completo", async () => {
    await render(<Skeleton shape="circle" height={40} testID="sk" />);
    expect(screen.getByTestId("sk", { includeHiddenElements: true })).toHaveStyle({
      width: 40,
      height: 40,
      borderRadius: 20,
    });
  });

  it("es estático: no monta animaciones", async () => {
    await render(<Skeleton shape="rect" testID="sk" />);
    const nodo = screen.getByTestId("sk", { includeHiddenElements: true });
    expect(StyleSheet.flatten(nodo.props.style)).not.toHaveProperty("opacity");
    expect(nodo.type).toBe("View");
  });
});
