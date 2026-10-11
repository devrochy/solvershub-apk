import { useState } from "react";
import { StyleSheet, TextInput, type StyleProp, type TextInputProps, type TextStyle } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { nombreDeCampo, useField } from "./Field";
import { useKit } from "./tema";

export interface TextFieldProps extends Omit<TextInputProps, "editable" | "style"> {
  /** Borde de peligro; dentro de un `Field` con `error` se activa solo. */
  invalid?: boolean;
  disabled?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Campo de texto del kit sobre `TextInput`. Dentro de un `Field` toma de ahí
 * su nombre accesible, la pista (error o ayuda) y el estado inválido. Alto
 * mínimo de 48 dp, foco con borde `focus` de 2 px.
 */
export function TextField({
  invalid,
  disabled = false,
  style,
  onFocus,
  onBlur,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: TextFieldProps) {
  const { c } = useKit();
  const campo = useField();
  const [enFoco, setEnFoco] = useState(false);
  const esInvalido = invalid ?? campo?.invalid ?? false;
  const grueso = esInvalido || enFoco ? 2 : 1;
  const borde = esInvalido ? c.statusDangerFg : enFoco ? c.focus : c.controlBorder;

  return (
    <TextInput
      {...props}
      accessibilityLabel={accessibilityLabel ?? (campo ? nombreDeCampo(campo) : undefined)}
      accessibilityHint={accessibilityHint ?? campo?.descripcion}
      accessibilityState={{ disabled }}
      editable={!disabled}
      placeholderTextColor={c.textSoft}
      onFocus={(e) => {
        setEnFoco(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setEnFoco(false);
        onBlur?.(e);
      }}
      style={[
        shType.body,
        styles.base,
        {
          color: disabled ? c.textSoft : c.text,
          backgroundColor: disabled ? c.surface2 : c.surface,
          borderColor: borde,
          borderWidth: grueso,
          // El borde más grueso no mueve el texto.
          paddingHorizontal: shSpace[3] - (grueso - 1),
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: shDensity.controlLg,
    borderRadius: shRadius.sm,
    paddingVertical: shSpace[2],
  },
});
