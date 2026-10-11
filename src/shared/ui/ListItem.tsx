import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { shDensity, shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { useKit } from "./tema";

export interface ListItemProps {
  title: string;
  subtitle?: string;
  /** Dato secundario corto (hora, cuota, distancia). */
  meta?: string;
  /** Avatar o ícono a la izquierda. */
  leading?: ReactNode;
  /** Contenido a la derecha (valor, botón, switch). */
  trailing?: ReactNode;
  /** `Badge` de estado bajo el título. */
  badge?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  /** Chevron cuando la fila navega (por defecto, si hay `onPress`). */
  showChevron?: boolean;
  /** Nombre accesible; por defecto, título, subtítulo y meta. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fila táctil de la app (cliente, cartera, pago), SPEC-29 §2. Alto mínimo de
 * 48 dp; seleccionada lleva fondo `surfaceRaised` e indicador de 3 px. El texto
 * no se trunca, para que la fuente al 200 % no corte nada.
 */
export function ListItem({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  badge,
  onPress,
  selected = false,
  disabled = false,
  showChevron,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ListItemProps) {
  const { c, ripple } = useKit();
  const nombre = accessibilityLabel ?? [title, subtitle, meta].filter(Boolean).join(", ");
  const conChevron = showChevron ?? Boolean(onPress);

  const contenido = (
    <>
      {selected ? <View testID="list-item-indicador" style={[styles.indicador, { backgroundColor: c.link }]} /> : null}
      {leading ? <View>{leading}</View> : null}
      <View style={styles.textos}>
        <Text style={[shType.body, { color: disabled ? c.textSoft : c.text }]}>{title}</Text>
        {subtitle ? <Text style={[shType.dense, { color: c.textMuted }]}>{subtitle}</Text> : null}
        {meta ? <Text style={[shType.caption, { color: c.textSoft }]}>{meta}</Text> : null}
        {badge ? <View style={styles.badge}>{badge}</View> : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {conChevron ? <Icono name="chevron-right" size={24} color={c.textSoft} /> : null}
    </>
  );

  const base = [styles.fila, { backgroundColor: selected ? c.surfaceRaised : c.surface }];

  if (!onPress) {
    return (
      <View testID={testID} accessible accessibilityLabel={nombre} style={[...base, style]}>
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={nombre}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [...base, pressed && Platform.OS === "ios" && { backgroundColor: c.hover }, style]}
    >
      {contenido}
    </Pressable>
  );
}

export interface RecordRowProps extends Omit<ListItemProps, "trailing"> {
  /** Cifra principal a la derecha (monto, saldo), con cifras tabulares. */
  value?: string;
  valueTone?: "neutral" | "success" | "warning" | "danger";
}

/**
 * Fila de registro: un `ListItem` con la cifra a la derecha (monto, saldo).
 * La cifra usa `tabular-nums` y limita el escalado a 1,6× para no romper la
 * fila; el nombre accesible la incluye.
 */
export function RecordRow({ value, valueTone = "neutral", accessibilityLabel, ...props }: RecordRowProps) {
  const { c, tonos } = useKit();
  const nombre =
    accessibilityLabel ?? [props.title, props.subtitle, props.meta, value].filter(Boolean).join(", ");
  return (
    <ListItem
      {...props}
      accessibilityLabel={nombre}
      trailing={
        value ? (
          <Text
            maxFontSizeMultiplier={1.6}
            style={[shType.label, styles.cifra, { color: valueTone === "neutral" ? c.text : tonos[valueTone].fg }]}
          >
            {value}
          </Text>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.rowComfortable,
    paddingHorizontal: shSpace[4],
    paddingVertical: shSpace[3],
  },
  indicador: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  textos: { flex: 1, gap: 2 },
  badge: { marginTop: shSpace[1] },
  trailing: { alignItems: "flex-end" },
  cifra: { fontVariant: ["tabular-nums"], textAlign: "right" },
});
