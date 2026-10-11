import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit } from "@shared/ui";

export interface CargaErrorProps {
  cargando: boolean;
  error: string | null;
  onReintentar(): void;
}

export function CargaError({ cargando, error, onReintentar }: CargaErrorProps) {
  const { c } = useKit();
  if (!cargando && !error) {
    return null;
  }
  return (
    <View style={styles.centro}>
      {cargando ? (
        <ActivityIndicator testID="carga-spinner" size="large" color={c.link} />
      ) : (
        <View style={styles.errorBox}>
          <View style={styles.fila} accessibilityLiveRegion="polite">
            <Icono name="error-outline" size={18} color={c.statusDangerFg} />
            <Text style={[shType.body, styles.error, { color: c.statusDangerFg }]}>{error}</Text>
          </View>
          <Button testID="reintentar" variant="secondary" iconLeft="refresh" onPress={onReintentar}>
            Reintentar
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: shSpace[3] },
  errorBox: { alignItems: "center", gap: shSpace[2], paddingHorizontal: shSpace[4] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  error: { flexShrink: 1, textAlign: "center" },
});
