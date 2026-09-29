import { ReactNode, useMemo } from "react";
import { shColor } from "../theme/tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BotonMenu } from "./BotonMenu";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import { useNotificaciones } from "../session/notificaciones-context";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { RootStackParamList } from "../navigation/types";

export interface HeaderAppProps {
  titulo: string;
  subtitulo?: string;
  /** Acciones contextuales en outline (p. ej. "+ Cliente"). */
  acciones?: ReactNode;
}

/**
 * Header estándar de la APK: hamburguesa (izquierda) + título; a la derecha la
 * campana de notificaciones (con badge) y luego las acciones contextuales
 * (outline). No hay avatar ni botón atrás: la cuenta y la navegación viven en el
 * menú hamburguesa.
 */
export function HeaderApp({ titulo, subtitulo, acciones }: HeaderAppProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { noLeidas, cargar } = useNotificaciones();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  return (
    <HeaderPantalla>
      <View style={estilosHeader.fila}>
        <View style={styles.izquierda}>
          <BotonMenu />
        </View>

        <View style={estilosHeader.bloqueTitulo}>
          <Text style={estilosHeader.titulo} numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo ? (
            <Text style={estilosHeader.subtitulo} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>

        <Pressable
          testID="header-notificaciones"
          accessibilityLabel="Notificaciones"
          hitSlop={8}
          style={styles.icono}
          onPress={() => {
            void cargar();
            navigation.navigate("Notificaciones");
          }}
        >
          <MaterialIcons name="notifications-none" size={24} color={shColor.white} />
          {noLeidas > 0 ? (
            <View testID="notif-badge" style={styles.badge}>
              <Text style={styles.badgeTexto}>{noLeidas > 9 ? "9+" : noLeidas}</Text>
            </View>
          ) : null}
        </Pressable>

        {acciones ? <View style={estilosHeader.accionesDerecha}>{acciones}</View> : null}
      </View>
    </HeaderPantalla>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    izquierda: { flexDirection: "row", alignItems: "center", gap: 2 },
    icono: { paddingVertical: 4, paddingHorizontal: 2 },
    badge: {
      position: "absolute",
      top: 0,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 999,
      backgroundColor: c.peligro,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeTexto: { color: shColor.white, fontSize: 10, fontWeight: "700" },
  });
}
