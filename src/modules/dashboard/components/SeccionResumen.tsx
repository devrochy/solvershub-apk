import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useKit } from "@shared/ui";

/**
 * Una sección del Resumen (SPEC-29): título, una frase que dice qué se está mirando y su
 * contenido. Los perfiles se leen de arriba abajo como secciones, no como una pila de tarjetas.
 */
export function SeccionResumen({
  titulo,
  apoyo,
  children,
  testID,
}: {
  titulo: string;
  apoyo?: string;
  children: ReactNode;
  testID?: string;
}) {
  const { c } = useKit();
  return (
    <View testID={testID} style={styles.seccion}>
      <View style={styles.cabecera}>
        <Text accessibilityRole="header" style={[shType.block, { color: c.textStrong }]}>
          {titulo}
        </Text>
        {apoyo ? <Text style={[shType.dense, { color: c.textMuted }]}>{apoyo}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: shSpace[3] },
  cabecera: { gap: 2 },
});
