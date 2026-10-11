import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "@core/theme/theme-context";
import { shTheme } from "@core/theme/tokens";
import { Badge } from "./Badge";
import { kitDeTema } from "./tema";

describe("mapeo del tema del kit", () => {
  it.each([
    ["claro", shTheme.light],
    ["oscuro", shTheme.dark],
  ] as const)("los tonos de estado salen de los tokens del tema %s", (tema, tokens) => {
    const kit = kitDeTema(tema);
    expect(kit.c).toBe(tokens);
    expect(kit.tonos.success).toEqual({
      fg: tokens.statusSuccessFg,
      bg: tokens.statusSuccessBg,
      border: tokens.statusSuccessBorder,
    });
    expect(kit.tonos.danger.fg).toBe(tokens.statusDangerFg);
  });

  it("los componentes siguen al tema oscuro del ThemeProvider", async () => {
    await AsyncStorage.setItem("cobranza_tema", "oscuro");
    await render(
      <ThemeProvider>
        <Badge tone="success" icon="check-circle" label="Al día" />
      </ThemeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("Al día")).toHaveStyle({ color: shTheme.dark.statusSuccessFg }),
    );
    await AsyncStorage.clear();
  });
});
