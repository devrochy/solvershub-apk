import { Pressable, StyleSheet } from "react-native";
import { shColor } from "../theme/tokens";
import { MaterialIcons } from "@expo/vector-icons";
import { useMenuLateral } from "../navigation/menu-lateral-context";

/** Botón hamburguesa que abre/cierra el menú lateral. Va en el header. */
export function BotonMenu() {
  const { alternar } = useMenuLateral();

  return (
    <Pressable
      testID="btn-menu"
      accessibilityRole="button"
      accessibilityLabel="Abrir menú"
      hitSlop={8}
      onPress={alternar}
      style={styles.boton}
    >
      <MaterialIcons name="menu" size={24} color={shColor.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
});
