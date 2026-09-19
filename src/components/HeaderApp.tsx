import { ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Avatar } from "./Avatar";
import { BotonMenu } from "./BotonMenu";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import { useNotificaciones } from "../session/notificaciones-context";
import { useSession } from "../session/session-context";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { RootStackParamList } from "../navigation/types";

export interface HeaderAppProps {
  titulo: string;
  subtitulo?: string;
  /** Acciones contextuales (p. ej. "+ Cliente"), antes del avatar. */
  acciones?: ReactNode;
}

/**
 * Header estándar de la APK: hamburguesa (izquierda) + título; a la derecha el
 * avatar del usuario (abre Perfil) y la campana de notificaciones con badge.
 * No hay botón atrás: la navegación es por el menú y el swipe izquierda→derecha.
 */
export function HeaderApp({ titulo, subtitulo, acciones }: HeaderAppProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { gestor } = useSession();
  const { noLeidas, cargar } = useNotificaciones();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

  const nombre = `${gestor?.nombre ?? ""} ${gestor?.apellido ?? ""}`.trim();

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

        {acciones ? <View style={estilosHeader.accionesDerecha}>{acciones}</View> : null}

        <Pressable
          testID="header-perfil"
          style={styles.perfil}
          onPress={() => navigation.navigate("Perfil")}
        >
          <Avatar nombre={nombre || "?"} size={28} />
        </Pressable>

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
          <MaterialIcons name="notifications-none" size={24} color="#ffffff" />
          {noLeidas > 0 ? (
            <View testID="notif-badge" style={styles.badge}>
              <Text style={styles.badgeTexto}>{noLeidas > 9 ? "9+" : noLeidas}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </HeaderPantalla>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    izquierda: { flexDirection: "row", alignItems: "center", gap: 2 },
    icono: { paddingVertical: 4, paddingHorizontal: 2 },
    perfil: { alignItems: "center", justifyContent: "center" },
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
    badgeTexto: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
  });
}
