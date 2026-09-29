import { useMemo } from "react";
import { shColor } from "../theme/tokens";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";

export interface CargaErrorProps {
  cargando: boolean;
  error: string | null;
  onReintentar(): void;
}

export function CargaError({ cargando, error, onReintentar }: CargaErrorProps) {
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  if (!cargando && !error) {
    return null;
  }
  return (
    <View style={styles.centro}>
      {cargando ? (
        <ActivityIndicator testID="carga-spinner" size="large" />
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable testID="reintentar" style={styles.boton} onPress={onReintentar}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
    errorBox: { alignItems: "center", gap: 8 },
    error: { color: c.peligro, fontSize: 15 },
    boton: {
      backgroundColor: c.primario,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    botonTexto: { color: shColor.white, fontWeight: "600" },
  });
}