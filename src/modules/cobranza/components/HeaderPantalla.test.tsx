import { render } from "@testing-library/react-native";
import { Text } from "react-native";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import { COLORES } from "@core/theme/theme";
import { shType } from "@core/theme/tokens";
import { kitDeTema } from "@shared/ui";

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
  it("el título usa la escala del kit (block en negrita) con el texto de la banda", () => {
    // HU-DS-10: antes 18 px fijo; ahora `shType.block` (17/24) con Montserrat Bold.
    expect(estilosHeader.titulo).toEqual(
      expect.objectContaining({
        fontSize: shType.block.fontSize,
        lineHeight: shType.block.lineHeight,
        color: kitDeTema("claro").banda.texto,
        fontFamily: "Montserrat_700Bold",
      }),
    );
  });

  it("las ranuras laterales fijan el mismo ancho para alinear el título en todas las vistas", () => {
    expect(estilosHeader.columnaIzq).toHaveProperty("width", 72);
    expect(estilosHeader.columnaDerecha).toHaveProperty("width", 72);
  });
});