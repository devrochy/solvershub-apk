import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Banda superior azul (primary) de las pantallas autenticadas. Se extiende
 * hasta la barra de notificaciones usando el insets superior, de modo que el
 * azul cubre todo el área de estado. El contenido (fila de título/acciones) se
 * pasa como children.
 */
export function HeaderPantalla({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="banda-header" style={[styles.banda, { paddingTop: insets.top }]}>
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
 *   (ClienteScreen, RutaDetalleScreen); el resto parte el título en x=16 y se
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
    color: "#ffffff",
    fontFamily: "Roboto_700Bold",
  },
  subtitulo: {
    color: "#d4dff0",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Roboto_400Regular",
  },
  accionTexto: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Roboto_600SemiBold",
  },
  accionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accionPillTexto: {
    color: "#172f6c",
    fontWeight: "700",
    fontSize: 14,
    fontFamily: "Roboto_700Bold",
  },
});

const styles = StyleSheet.create({
  banda: {
    backgroundColor: "#172f6c",
  },
});