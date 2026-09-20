import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { EvidenciaSeleccionada } from "../features/gastos/use-evidencias";

export interface EvidenciaPickerProps {
  evidencias: EvidenciaSeleccionada[];
  cargando: boolean;
  error: string | null;
  onAgregarLibreria(): void;
  onAgregarCamara(): void;
  onQuitar(uri: string): void;
  max: number;
}

export function EvidenciaPicker({
  evidencias,
  cargando,
  error,
  onAgregarLibreria,
  onAgregarCamara,
  onQuitar,
  max,
}: EvidenciaPickerProps) {
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const lleno = evidencias.length >= max;

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaBotones}>
        <Pressable
          testID="evidencia-libreria"
          style={[styles.boton, lleno && styles.botonDeshabilitado]}
          disabled={cargando || lleno}
          onPress={onAgregarLibreria}
        >
          <Text style={styles.botonTexto}>Librería</Text>
        </Pressable>
        <Pressable
          testID="evidencia-camara"
          style={[styles.boton, lleno && styles.botonDeshabilitado]}
          disabled={cargando || lleno}
          onPress={onAgregarCamara}
        >
          <Text style={styles.botonTexto}>Cámara</Text>
        </Pressable>
        {cargando ? <ActivityIndicator /> : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <View style={styles.miniaturas}>
        {evidencias.map((evidencia) => (
          <View key={evidencia.uri} style={styles.miniaturaContenedor}>
            <Image
              testID={`evidencia-miniatura-${evidencia.uri}`}
              source={{ uri: evidencia.uri }}
              style={styles.miniatura}
            />
            <Pressable
              testID={`evidencia-quitar-${evidencia.uri}`}
              style={styles.quitar}
              hitSlop={12}
              accessibilityLabel="Quitar evidencia"
              onPress={() => onQuitar(evidencia.uri)}
            >
              <Text style={styles.quitarTexto}>×</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Text style={styles.contador}>
        {evidencias.length}/{max} evidencias
      </Text>
    </View>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { gap: 8 },
    filaBotones: { flexDirection: "row", gap: 8, alignItems: "center" },
    boton: {
      borderWidth: 1,
      borderColor: c.primario,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    botonDeshabilitado: { opacity: 0.4 },
    botonTexto: { color: c.acento, fontWeight: "600" },
    error: { color: c.peligro, fontSize: 13 },
    miniaturas: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    miniaturaContenedor: { position: "relative" },
    miniatura: { width: 64, height: 64, borderRadius: 8 },
    quitar: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: c.peligro,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    quitarTexto: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
    contador: { color: c.textoSuave, fontSize: 12 },
  });
}