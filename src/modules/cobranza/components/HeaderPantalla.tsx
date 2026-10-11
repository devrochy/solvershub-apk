import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { kitDeTema, useKit } from "@shared/ui";

/**
 * Lo que va sobre la banda (texto, subtítulo, borde de píldora) es igual en
 * claro y en oscuro, así que los estilos estáticos lo toman de un solo tema.
 */
const BANDA = kitDeTema("claro").banda;

/**
 * Banda superior azul (primary) de las pantallas autenticadas. Se extiende
 * hasta la barra de notificaciones usando el insets superior, de modo que el
 * azul cubre todo el área de estado. El contenido (fila de título/acciones) se
 * pasa como children.
 */
export function HeaderPantalla({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { banda } = useKit();
  return (
    <View
      testID="banda-header"
      style={[
        styles.banda,
        { backgroundColor: banda.fondo, paddingTop: insets.top },
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
 * - `titulo` + `subtitulo`: bloque de título a la izquierda (`shType.block` en
 *   negrita sobre la banda; subtítulo `shType.dense` en el tono suave).
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
    gap: shSpace[2],
    paddingHorizontal: shSpace[4],
    paddingVertical: shSpace[3],
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
    ...shType.block,
    fontFamily: shType.hero.fontFamily,
    color: BANDA.texto,
  },
  subtitulo: {
    ...shType.dense,
    color: BANDA.textoSuave,
    marginTop: 2,
  },
  accionTexto: {
    ...shType.label,
    fontFamily: shType.h1.fontFamily,
    color: BANDA.texto,
  },
  accionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    borderWidth: 1,
    borderColor: BANDA.borde,
    backgroundColor: "transparent",
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
    paddingVertical: 6,
  },
  accionPillTexto: {
    ...shType.label,
    fontFamily: shType.hero.fontFamily,
    color: BANDA.texto,
  },
});

const styles = StyleSheet.create({
  banda: {},
});