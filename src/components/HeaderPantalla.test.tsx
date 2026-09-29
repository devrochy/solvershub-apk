import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import { COLORES } from "../theme/theme";
import { shColor } from "../theme/tokens";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 47, bottom: 0, left: 0, right: 0 })),
}));

describe("HeaderPantalla", () => {
  it("renderiza la banda azul primaria que cubre la barra de estado (insets)", async () => {
    const { getByTestId } = await render(
      <HeaderPantalla>
        <Text>Título</Text>
      </HeaderPantalla>,
    );

    const banda = getByTestId("banda-header");
    expect(banda).toHaveStyle({ backgroundColor: COLORES.claro.primario, paddingTop: 47 });
  });

  it("renderiza los children dentro de la banda", async () => {
    const { getByText } = await render(
      <HeaderPantalla>
        <Text>Cobros del día</Text>
      </HeaderPantalla>,
    );

    expect(getByText("Cobros del día")).toBeTruthy();
  });
});

describe("estilosHeader — estándar de headers", () => {
  it("el título usa el tamaño estándar 18, bold y blanco", () => {
    expect(estilosHeader.titulo).toEqual(
      expect.objectContaining({
        fontSize: 18,
        fontWeight: "700",
        color: shColor.white,
        fontFamily: "Montserrat_700Bold",
      }),
    );
  });

  it("las ranuras laterales fijan el mismo ancho para alinear el título en todas las vistas", () => {
    expect(estilosHeader.columnaIzq).toHaveProperty("width", 72);
    expect(estilosHeader.columnaDerecha).toHaveProperty("width", 72);
  });
});