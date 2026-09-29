import { ReactNode } from "react";
import { shColor } from "../theme/tokens";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme-context";

/**
 * Banda superior azul (primary) de las pantallas autenticadas. Se extiende
 * hasta la barra de notificaciones usando el insets superior, de modo que el
 * azul cubre todo el área de estado. El contenido (fila de título/acciones) se
 * pasa como children.
 */
export function HeaderPantalla({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { colores } = useTheme();
  return (
    <View
      testID="banda-header"
      style={[
        styles.banda,
        { backgroundColor: colores.primario, paddingTop: insets.top },
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Estándar de headers de la APK (excluyendo Login). Todas las vistas
 * autenticadas usan estos tokens para que el título, el padding y las acciones
 * sean idénticos en todas ellas:
 * - `fila`: fila del header (padding 16/12, gap 8).
 * - `titulo` + `subtitulo`: bloque de título a la izquierda (18 bold blanco;
 *   subtítulo 13 azul-claro).
 * - `columnaIzq`/`columnaDerecha`: ranuras laterales de ancho fijo (72) para
 *   back y acciones. Solo se usan en las vistas con back/acción lateral
 *   (ClienteScreen, CarteraDetalleScreen); el resto parte el título en x=16 y se
 *   apoya en `accionesDerecha` cuando hay contenido al final (badge+Salir).
 * - `accionTexto`: acción de texto plano (Salir/Editar) sobre el azul.
 * - `accionPill`/`accionPillTexto`: CTA en píldora blanca con texto navy.
 */
export const estilosHeader = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  columnaIzq: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  columnaDerecha: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  accionesDerecha: { flexDirection: "row", alignItems: "center", gap: 10 },
  bloqueTitulo: { flex: 1 },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    color: shColor.white,
    fontFamily: "Montserrat_700Bold",
  },
  subtitulo: {
    color: shColor.ice,
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Inter_400Regular",
  },
  accionTexto: {
    color: shColor.white,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Montserrat_600SemiBold",
  },
  accionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    backgroundColor: "transparent",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  accionPillTexto: {
    color: shColor.white,
    fontWeight: "700",
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
  },
});

const styles = StyleSheet.create({
  banda: {},
});