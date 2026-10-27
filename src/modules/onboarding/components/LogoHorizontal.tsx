import { Image, StyleSheet } from "react-native";
import { useTheme } from "@core/theme/theme-context";

const LOGOS = {
  claro: {
    completo: require("../../../../assets/marca/horizontal-tema-claro.png"),
    simple: require("../../../../assets/marca/horizontal-simple-tema-claro.png"),
  },
  oscuro: {
    completo: require("../../../../assets/marca/horizontal-tema-oscuro.png"),
    simple: require("../../../../assets/marca/horizontal-simple-tema-oscuro.png"),
  },
} as const;

/** Relación ancho/alto de los PNG (640 × 163). */
const PROPORCION = 640 / 163;

/**
 * Logo horizontal con ícono, en la variante del tema activo. Bajo 240 dp de ancho se usa la variante
 * simple (manual de marca §4); nunca se recolorea.
 */
export function LogoHorizontal({ ancho = 168 }: { ancho?: number }) {
  const { tema } = useTheme();
  const variante = ancho < 240 ? "simple" : "completo";
  return (
    <Image
      testID="logo-horizontal"
      accessibilityRole="image"
      accessibilityLabel="SolversHub"
      source={LOGOS[tema][variante]}
      style={[styles.logo, { width: ancho, height: ancho / PROPORCION }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({ logo: { alignSelf: "flex-start" } });
