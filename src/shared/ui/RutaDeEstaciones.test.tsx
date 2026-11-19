import { render, screen } from "@testing-library/react-native";
import { RutaDeEstaciones } from "./RutaDeEstaciones";

const ESTACIONES = [
  { id: "negocio", titulo: "Tu negocio" },
  { id: "habilidades", titulo: "Habilidades" },
  { id: "datos-cliente", titulo: "Datos del cliente" },
  { id: "datos-probar", titulo: "Datos para probar" },
  { id: "revisar", titulo: "Revisar y publicar" },
];

describe("RutaDeEstaciones (kit, HU-APP-23)", () => {
  it("dice el paso, la estación y las hechas, con su valor de progreso", async () => {
    await render(<RutaDeEstaciones estaciones={ESTACIONES} actual={2} testID="ruta" />);
    expect(screen.getByText("Paso 3 de 5 · Datos del cliente")).toBeTruthy();
    const barra = screen.getByTestId("ruta");
    expect(barra.props.accessibilityRole).toBe("progressbar");
    expect(barra.props.accessibilityValue).toEqual({ min: 1, max: 5, now: 3 });
    expect(barra.props.accessibilityLabel).toBe("Paso 3 de 5 · Datos del cliente. Hechas: Tu negocio, Habilidades");
  });

  it("las hechas van con el degradado y la actual es más larga que las pendientes", async () => {
    await render(<RutaDeEstaciones estaciones={ESTACIONES} actual={1} testID="ruta" />);
    expect(screen.getByTestId("ruta-hecha-0", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId("ruta-actual-1", { includeHiddenElements: true })).toHaveStyle({ width: 22 });
    expect(screen.getByTestId("ruta-pendiente-2", { includeHiddenElements: true })).toHaveStyle({ width: 8 });
  });

  it("acepta un texto propio y acota el índice", async () => {
    await render(<RutaDeEstaciones estaciones={ESTACIONES} actual={9} texto="Casi listo" />);
    expect(screen.getByText("Casi listo")).toBeTruthy();
  });
});
