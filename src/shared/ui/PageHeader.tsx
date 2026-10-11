import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { IconButton } from "./IconButton";
import { useKit } from "./tema";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Acciones a la derecha (`IconButton`s o un `Button`). */
  actions?: ReactNode;
  /** Si se pasa, muestra "Volver" a la izquierda. */
  onBack?: () => void;
  backLabel?: string;
  testID?: string;
}

/**
 * Encabezado de pantalla (SPEC-29 §2, `PageHeader` v2; en la app equivale a
 * `HeaderPantalla`). No reserva el área segura: lo hace la pantalla que lo usa.
 */
export function PageHeader({ title, description, actions, onBack, backLabel = "Volver", testID }: PageHeaderProps) {
  const { c } = useKit();
  return (
    <View testID={testID} style={styles.contenedor}>
      {onBack ? <IconButton icon="arrow-back" label={backLabel} onPress={onBack} /> : null}
      <View style={[styles.titulos, !onBack && styles.sinVolver]}>
        <Text accessibilityRole="header" style={[shType.h1, { color: c.text }]}>
          {title}
        </Text>
        {description ? <Text style={[shType.dense, { color: c.textMuted }]}>{description}</Text> : null}
      </View>
      {actions ? <View style={styles.acciones}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[1],
    paddingHorizontal: shSpace[1],
    paddingVertical: shSpace[2],
  },
  titulos: { flex: 1, gap: shSpace[1], paddingVertical: shSpace[2] },
  sinVolver: { paddingLeft: shSpace[3] },
  acciones: { flexDirection: "row", alignItems: "center" },
});
