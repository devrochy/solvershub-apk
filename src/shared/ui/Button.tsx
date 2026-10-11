import { useMemo } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit, type KitTema } from "./tema";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  /** Texto del botón: también es su nombre accesible. */
  children: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Spinner dentro sin cambiar el ancho; pone `accessibilityState.busy`. */
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  /** Ocupa todo el ancho del contenedor (CTA en la zona del pulgar). */
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

interface Apariencia {
  fondo: string;
  borde: string;
  texto: string;
  ripple: string;
}

function apariencia(kit: KitTema, variant: ButtonVariant, inactivo: boolean): Apariencia {
  const { c, relleno, ripple } = kit;
  if (inactivo && variant !== "link" && variant !== "ghost") {
    // Deshabilitado: texto `textSoft` y borde `controlBorder`, sin opacidad sobre el texto.
    return { fondo: c.surface2, borde: c.controlBorder, texto: c.textSoft, ripple: ripple.superficie };
  }
  switch (variant) {
    case "primary":
      return { fondo: relleno.primario, borde: relleno.primario, texto: relleno.sobrePrimario, ripple: ripple.relleno };
    case "danger":
      return { fondo: relleno.peligro, borde: relleno.peligro, texto: relleno.sobrePeligro, ripple: ripple.relleno };
    case "secondary":
      return { fondo: c.surface, borde: c.controlBorder, texto: c.text, ripple: ripple.superficie };
    case "ghost":
      return { fondo: "transparent", borde: "transparent", texto: inactivo ? c.textSoft : c.text, ripple: ripple.superficie };
    case "link":
      return { fondo: "transparent", borde: "transparent", texto: inactivo ? c.textSoft : c.link, ripple: ripple.superficie };
  }
}

const TAMANOS: Record<ButtonSize, { paddingHorizontal: number; minHeight: number; texto: TextStyle; icono: number }> = {
  sm: { paddingHorizontal: shSpace[3], minHeight: shDensity.controlLg, texto: shType.label, icono: 18 },
  md: { paddingHorizontal: shSpace[4], minHeight: shDensity.controlLg, texto: shType.label, icono: 20 },
  lg: {
    paddingHorizontal: shSpace[6],
    minHeight: shSpace[12] + shSpace[2],
    texto: { ...shType.label, fontSize: shType.body.fontSize, lineHeight: shType.body.lineHeight },
    icono: 22,
  },
};

/**
 * Botón del kit (SPEC-29 §2, mismos nombres que el panel). Todas las medidas
 * dan un blanco táctil de al menos 48 × 48 dp; la presión usa el ripple del
 * tema en Android. `primary` es la CTA (una por pantalla).
 */
export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const kit = useKit();
  const inactivo = disabled || loading;
  const a = useMemo(() => apariencia(kit, variant, disabled), [kit, variant, disabled]);
  const t = TAMANOS[size];
  const esTexto = variant === "link" || variant === "ghost";

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      onPress={onPress}
      android_ripple={{ color: a.ripple }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: t.minHeight,
          paddingHorizontal: variant === "link" ? shSpace[2] : t.paddingHorizontal,
          backgroundColor: a.fondo,
          borderColor: a.borde,
          borderWidth: esTexto ? 0 : 1,
        },
        fullWidth && styles.fullWidth,
        pressed && Platform.OS === "ios" && styles.presionadoIos,
        style,
      ]}
    >
      <View style={[styles.fila, loading && styles.oculto]}>
        {iconLeft ? <Icono name={iconLeft} size={t.icono} color={a.texto} /> : null}
        <Text
          style={[
            t.texto,
            styles.texto,
            { color: a.texto },
            variant === "link" && styles.subrayado,
          ]}
        >
          {children}
        </Text>
        {iconRight ? <Icono name={iconRight} size={t.icono} color={a.texto} /> : null}
      </View>
      {loading ? (
        <ActivityIndicator
          testID={`${testID ?? "button"}-cargando`}
          color={a.texto}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: shDensity.controlLg,
    borderRadius: shRadius.md,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  fullWidth: { alignSelf: "stretch" },
  fila: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: shSpace[2] },
  // `loading` esconde el contenido pero lo deja montado: el botón no cambia de ancho.
  oculto: { opacity: 0 },
  texto: { textAlign: "center", flexShrink: 1 },
  subrayado: { textDecorationLine: "underline" },
  presionadoIos: { opacity: 0.85 },
});
