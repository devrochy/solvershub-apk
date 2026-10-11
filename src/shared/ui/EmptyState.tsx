import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button } from "./Button";
import { Icono, type IconName } from "./icono";
import { useKit } from "./tema";

export interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateBase {
  icon: IconName;
  title: string;
  description?: string;
  testID?: string;
}

/**
 * Siempre ofrece una acción (regla de HU-UX-04): la principal, la secundaria o
 * las dos. Un EmptyState sin ninguna no compila.
 */
export type EmptyStateProps = EmptyStateBase &
  (
    | { action: EmptyStateAction; secondaryAction?: EmptyStateAction }
    | { action?: undefined; secondaryAction: EmptyStateAction }
  );

/** Estado vacío: explica qué pasa y orienta con una acción. */
export function EmptyState({ icon, title, description, action, secondaryAction, testID }: EmptyStateProps) {
  const { c } = useKit();
  return (
    <View testID={testID} style={styles.contenedor}>
      <View style={[styles.icono, { backgroundColor: c.surface2 }]}>
        <Icono name={icon} size={28} color={c.textMuted} />
      </View>
      <Text accessibilityRole="header" style={[shType.block, styles.centro, { color: c.text }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[shType.dense, styles.centro, { color: c.textMuted }]}>{description}</Text>
      ) : null}
      <View style={styles.acciones}>
        {action ? <Button onPress={action.onPress}>{action.label}</Button> : null}
        {secondaryAction ? (
          <Button variant={action ? "ghost" : "secondary"} onPress={secondaryAction.onPress}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: "center",
    gap: shSpace[2],
    paddingHorizontal: shSpace[6],
    paddingVertical: shSpace[8],
  },
  icono: {
    width: 56,
    height: 56,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: shSpace[2],
  },
  centro: { textAlign: "center" },
  acciones: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: shSpace[2],
    marginTop: shSpace[2],
  },
});
