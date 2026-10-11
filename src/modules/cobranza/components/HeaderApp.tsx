import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";
import { BotonMenu } from "./BotonMenu";
import { EstadoSincronizacion } from "./EstadoSincronizacion";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import { useNotificaciones } from "../session/notificaciones-context";
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
 * menú hamburguesa. Debajo de la banda va el estado de sincronización
 * (`SyncStatus`, HU-DS-10), siempre visible en campo.
 */
export function HeaderApp({ titulo, subtitulo, acciones }: HeaderAppProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { noLeidas, cargar } = useNotificaciones();
  const { banda, relleno, ripple } = useKit();

  return (
    <>
      <HeaderPantalla>
        <View style={estilosHeader.fila}>
          <View style={styles.izquierda}>
            <BotonMenu />
          </View>

          <View style={[estilosHeader.bloqueTitulo, styles.titulo]}>
            <Text accessibilityRole="header" style={estilosHeader.titulo} numberOfLines={1}>
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
            accessibilityRole="button"
            accessibilityLabel={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
            android_ripple={{ color: ripple.relleno, borderless: true, radius: shDensity.controlLg / 2 }}
            style={styles.icono}
            onPress={() => {
              void cargar();
              navigation.navigate("Notificaciones");
            }}
          >
            <Icono name="notifications-none" size={24} color={banda.texto} />
            {noLeidas > 0 ? (
              <View testID="notif-badge" style={[styles.badge, { backgroundColor: relleno.peligro }]}>
                <Text style={[styles.badgeTexto, { color: relleno.sobrePeligro }]} maxFontSizeMultiplier={1.6}>
                  {noLeidas > 9 ? "9+" : noLeidas}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {acciones ? <View style={estilosHeader.accionesDerecha}>{acciones}</View> : null}
        </View>
      </HeaderPantalla>
      <EstadoSincronizacion />
    </>
  );
}

const styles = StyleSheet.create({
  // El botón de menú y la campana miden 48 dp; la fila los centra con el título.
  izquierda: { flexDirection: "row", alignItems: "center", gap: 2, marginVertical: -shSpace[2], marginLeft: -shSpace[2] },
  titulo: { justifyContent: "center", minHeight: shDensity.controlLg - shSpace[4] },
  icono: {
    minWidth: shDensity.controlLg,
    minHeight: shDensity.controlLg,
    marginVertical: -shSpace[2],
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: shSpace[1],
    right: shSpace[1],
    minWidth: 16,
    height: 16,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: shSpace[1],
  },
  badgeTexto: { ...shType.caption, fontFamily: shType.hero.fontFamily, fontSize: 10, lineHeight: 14 },
});
