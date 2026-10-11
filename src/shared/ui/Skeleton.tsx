import { StyleSheet, View, type DimensionValue } from "react-native";
import { shRadius, shSpace } from "@core/theme/tokens";
import { useKit } from "./tema";

export type SkeletonShape = "text" | "rect" | "circle";

export interface SkeletonProps {
  shape?: SkeletonShape;
  /** Solo `text`: cantidad de líneas (la última, más corta). */
  lines?: number;
  width?: DimensionValue;
  height?: number;
  testID?: string;
}

const ALTO_LINEA = 12;

/**
 * Esqueleto de carga con la forma del contenido. Estático, sin pulso ni brillo
 * (regla de `DESIGN.md`). Es decorativo: el estado "cargando" lo anuncia el
 * contenedor con `accessibilityState.busy`.
 */
export function Skeleton({ shape = "text", lines = 1, width, height, testID }: SkeletonProps) {
  const { esqueleto } = useKit();
  const oculto = {
    accessibilityElementsHidden: true,
    importantForAccessibility: "no-hide-descendants" as const,
  };

  if (shape === "circle") {
    const dp = height ?? 40;
    return (
      <View
        testID={testID}
        {...oculto}
        style={{ width: dp, height: dp, borderRadius: dp / 2, backgroundColor: esqueleto }}
      />
    );
  }

  if (shape === "rect") {
    return (
      <View
        testID={testID}
        {...oculto}
        style={[styles.rect, { width: width ?? "100%", height: height ?? 48, backgroundColor: esqueleto }]}
      />
    );
  }

  return (
    <View testID={testID} {...oculto} style={[styles.texto, { width: width ?? "100%" }]}>
      {Array.from({ length: Math.max(1, lines) }, (_, i) => (
        <View
          key={i}
          testID={testID ? `${testID}-linea` : undefined}
          style={[
            styles.linea,
            { height: height ?? ALTO_LINEA, backgroundColor: esqueleto },
            lines > 1 && i === lines - 1 && styles.ultima,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rect: { borderRadius: shRadius.sm },
  texto: { gap: shSpace[2] },
  linea: { borderRadius: shRadius.sm, width: "100%" },
  ultima: { width: "60%" },
});
