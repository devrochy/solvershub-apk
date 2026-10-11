import { useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit, type KitTema } from "@shared/ui";
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
  const kit = useKit();
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  const lleno = evidencias.length >= max;

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaBotones}>
        <Button
          testID="evidencia-libreria"
          variant="secondary"
          size="sm"
          iconLeft="photo-library"
          disabled={cargando || lleno}
          onPress={onAgregarLibreria}
        >
          Librería
        </Button>
        <Button
          testID="evidencia-camara"
          variant="secondary"
          size="sm"
          iconLeft="photo-camera"
          disabled={cargando || lleno}
          onPress={onAgregarCamara}
        >
          Cámara
        </Button>
        {cargando ? <ActivityIndicator color={kit.c.link} /> : null}
      </View>

      {error ? (
        <View style={styles.filaError} accessibilityLiveRegion="polite">
          <Icono name="error-outline" size={16} color={kit.c.statusDangerFg} />
          <Text style={styles.error}>{error}</Text>
        </View>
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
              hitSlop={14}
              accessibilityRole="button"
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

function crearEstilos({ c, relleno }: KitTema) {
  return StyleSheet.create({
    contenedor: { gap: shSpace[2] },
    filaBotones: { flexDirection: "row", gap: shSpace[2], alignItems: "center" },
    filaError: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
    error: { ...shType.dense, color: c.statusDangerFg, flexShrink: 1 },
    miniaturas: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
    miniaturaContenedor: { position: "relative" },
    miniatura: { width: 64, height: 64, borderRadius: shRadius.sm },
    // 20 dp visibles + hitSlop de 14 por lado = blanco táctil de 48 dp.
    quitar: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: relleno.peligro,
      borderRadius: shRadius.pill,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    quitarTexto: { ...shType.label, fontFamily: shType.hero.fontFamily, color: relleno.sobrePeligro, lineHeight: 18 },
    contador: { ...shType.caption, color: c.textMuted },
  });
}
