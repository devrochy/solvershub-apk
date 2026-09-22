import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { RootStackParamList } from "../navigation/types";

/** Normaliza una etiqueta para usarla como clave/testID (sin acentos ni mayúsculas). */
export function slugSeccion(seccion: string): string {
  return seccion
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export interface BreadcrumbProps {
  /** Sección actual (nivel 2). "Inicio" se antepone automáticamente y navega a Main. */
  seccion: string;
}

/**
 * Ruta de navegación (`Inicio / Sección`) bajo el header. "Inicio" siempre
 * vuelve a `Main`; la sección actual no es enlace. Sustituye la barra de
 * tarjeta por una banda fina adaptada al tema (claro/oscuro).
 */
export function Breadcrumb({ seccion }: BreadcrumbProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  return (
    <View testID="breadcrumb" style={styles.barra}>
      <Pressable
        testID="breadcrumb-inicio"
        accessibilityRole="link"
        accessibilityLabel="Ir a Inicio"
        hitSlop={6}
        onPress={() => navigation.navigate("Main")}
        style={styles.enlace}
      >
        <MaterialIcons name="home" size={15} color={colores.acento} />
        <Text style={styles.textoEnlace}>Inicio</Text>
      </Pressable>

      <View
        style={styles.separador}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <MaterialIcons name="chevron-right" size={16} color={colores.textoSuave} />
      </View>

      <Text
        testID={`breadcrumb-${slugSeccion(seccion)}`}
        style={styles.textoActual}
        numberOfLines={1}
      >
        {seccion}
      </Text>
    </View>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    barra: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      paddingHorizontal: 16,
      minHeight: 44,
      backgroundColor: c.tarjeta,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borde,
    },
    enlace: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      minHeight: 44,
      paddingRight: 2,
    },
    textoEnlace: {
      fontSize: 13,
      fontWeight: "600",
      color: c.acento,
      fontFamily: "Roboto_600SemiBold",
    },
    separador: { alignItems: "center", justifyContent: "center" },
    textoActual: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "700",
      color: c.texto,
      fontFamily: "Roboto_700Bold",
    },
  });
}
