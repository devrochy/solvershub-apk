import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";

export interface CampoModalProps extends TextInputProps {
  /** Etiqueta superior del campo (opcional). */
  label?: string;
}

/**
 * Campo estándar de los modales: etiqueta + `TextInput` con estilos pastel
 * (fondo blanco, borde azul claro, texto slate). Se usa dentro de
 * `ModalConFooter` para que todos los formularios internos se vean igual.
 */
export function CampoModal({ label, style, ...props }: CampoModalProps) {
  return (
    <View style={styles.contenedor}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: 4 },
  label: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#334155",
  },
});
