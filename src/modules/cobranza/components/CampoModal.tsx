import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { TextField, useKit, type TextFieldProps } from "@shared/ui";

export interface CampoModalProps extends TextFieldProps {
  /** Etiqueta superior del campo (opcional). */
  label?: string;
  /** Igual que en `TextInput`: `false` lo deja de solo lectura (`disabled` del kit). */
  editable?: boolean;
}

/**
 * Campo estándar de los modales: etiqueta + `TextField` del kit (48 dp, borde
 * `controlBorder` y foco con `focus`). Se usa dentro de `ModalConFooter` para
 * que todos los formularios internos se vean igual. La etiqueta sigue siendo
 * un texto visible y además nombra al control para el lector de pantalla.
 */
export function CampoModal({ label, accessibilityLabel, editable, disabled, ...props }: CampoModalProps) {
  const { c } = useKit();
  return (
    <View style={styles.contenedor}>
      {label ? <Text style={[shType.label, { color: c.textMuted }]}>{label}</Text> : null}
      <TextField
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={disabled ?? editable === false}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[1] },
});
