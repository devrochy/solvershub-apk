import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export interface CargaErrorProps {
  cargando: boolean;
  error: string | null;
  onReintentar(): void;
}

export function CargaError({ cargando, error, onReintentar }: CargaErrorProps) {
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

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorBox: { alignItems: "center", gap: 8 },
  error: { color: "#dc2626", fontSize: 15 },
  boton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  botonTexto: { color: "#ffffff", fontWeight: "600" },
});