import { StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { shSpace, shType } from "@core/theme/tokens";
import { useKit } from "./tema";

export interface EstacionDeRuta {
  id: string;
  titulo: string;
}

export interface RutaDeEstacionesProps {
  estaciones: readonly EstacionDeRuta[];
  /** Índice (desde 0) de la estación actual. */
  actual: number;
  /** Texto que acompaña los puntos; por defecto «Paso N de M · {estación}». */
  texto?: string;
  /** Sobre la franja oscura del escenario (colores del escenario en los dos temas). */
  sobreEscenario?: boolean;
  testID?: string;
}

const ALTO = 8;
const PUNTO = 8;
const ACTUAL = 22;

/**
 * Mini ruta de la «Ruta de lanzamiento» (HU-APP-23, SPEC-49): un punto por estación, el actual alargado y los
 * hechos con el degradado de la marca (`LinearGradient` de `react-native-svg`), seguidos de «Paso N de 5 ·
 * Estación». El estado nunca va solo por color: el actual es más largo y el lector de pantalla oye el paso, las
 * hechas y la que sigue.
 */
export function RutaDeEstaciones({
  estaciones,
  actual,
  texto,
  sobreEscenario = false,
  testID,
}: RutaDeEstacionesProps) {
  const { c, escenario } = useKit();
  const total = estaciones.length;
  const i = Math.min(Math.max(actual, 0), total - 1);
  const visible =
    texto ?? `Paso ${i + 1} de ${total} · ${estaciones[i]?.titulo ?? ""}`;
  const hechas = estaciones.slice(0, i).map((e) => e.titulo);
  const etiqueta = [
    visible,
    hechas.length > 0 ? `Hechas: ${hechas.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(". ");
  const pendiente = sobreEscenario ? escenario.pendiente : c.border;
  const fuerte = sobreEscenario ? escenario.acento : c.link;
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityValue={{ min: 1, max: total, now: i + 1 }}
      testID={testID}
    >
      <View
        style={styles.puntos}
        importantForAccessibility="no-hide-descendants"
      >
        {estaciones.map((e, j) => {
          const ancho = j === i ? ACTUAL : PUNTO;
          if (j < i) {
            return (
              <View
                key={e.id}
                testID={testID ? `${testID}-hecha-${j}` : undefined}
              >
                <Svg width={ancho} height={ALTO}>
                  <Defs>
                    <LinearGradient
                      id={`ruta-${e.id}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <Stop offset="0" stopColor={escenario.desde} />
                      <Stop offset="1" stopColor={escenario.hasta} />
                    </LinearGradient>
                  </Defs>
                  <Rect
                    width={ancho}
                    height={ALTO}
                    rx={ALTO / 2}
                    fill={`url(#ruta-${e.id})`}
                  />
                </Svg>
              </View>
            );
          }
          return (
            <View
              key={e.id}
              testID={
                testID
                  ? `${testID}-${j === i ? "actual" : "pendiente"}-${j}`
                  : undefined
              }
              style={[
                styles.punto,
                { width: ancho, backgroundColor: j === i ? fuerte : pendiente },
              ]}
            />
          );
        })}
      </View>
      <Text
        style={[
          shType.caption,
          styles.texto,
          { color: sobreEscenario ? escenario.textoSuave : c.textMuted },
        ]}
      >
        {visible}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  puntos: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  punto: { height: ALTO, borderRadius: ALTO / 2 },
  texto: { flexShrink: 1 },
});
