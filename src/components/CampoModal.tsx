import { useMemo } from "react";
import { conAlfa } from "../theme/alpha";
import { shColor } from "../theme/tokens";
import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";

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
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  return (
    <View style={styles.contenedor}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colores.textoSuave}
        {...props}
      />
    </View>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { gap: 4 },
    label: { fontSize: 13, color: c.textoSuave, fontWeight: "600" },
    input: {
      backgroundColor: c.tarjeta,
      borderWidth: 1,
      borderColor: conAlfa(shColor.blue["500"], 0.2),
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.texto,
    },
  });
}
