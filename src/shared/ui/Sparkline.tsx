import { useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

export interface SparklineProps {
  /** Un valor por día; `null` corta la línea (sin dato). */
  values: (number | null)[];
  color: string;
  /** Color del anillo del último punto (el fondo de la tarjeta). */
  fondo: string;
  height?: number;
  /** Lavado bajo la línea (10 %). */
  area?: boolean;
  /** Resumen para lectores de pantalla; sin él es decorativa (la cifra ya está escrita al lado). */
  label?: string;
  testID?: string;
}

const AIRE = 6;

function esNumero(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Tendencia mínima sin ejes (SPEC-29): trazo de 2 dp y punto en el último valor. Ocupa todo el
 * ancho disponible. Una serie plana queda centrada en vez de pegada a un borde.
 */
export function Sparkline({ values, color, fondo, height = 32, area = false, label, testID }: SparklineProps) {
  const [ancho, setAncho] = useState(0);
  const validos = values.filter(esNumero);
  const min = Math.min(...validos);
  const max = Math.max(...validos);
  const n = values.length;
  const util = Math.max(1, ancho - AIRE * 2);
  const x = (i: number) => AIRE + (n <= 1 ? util / 2 : (i / (n - 1)) * util);
  const y = (v: number) => {
    if (min === max) return height / 2;
    return AIRE + (height - AIRE * 2) * (1 - (v - min) / (max - min));
  };

  let d = "";
  let abierto = false;
  let primero = -1;
  let ultimo = -1;
  values.forEach((v, i) => {
    if (!esNumero(v)) {
      abierto = false;
      return;
    }
    d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    abierto = true;
    if (primero < 0) primero = i;
    ultimo = i;
  });
  const linea = d.trim();
  const base = height - AIRE;
  const lavado =
    area && primero >= 0 && validos.length === n
      ? `${linea} L${x(ultimo).toFixed(1)},${base} L${x(primero).toFixed(1)},${base} Z`
      : null;

  const a11y = label
    ? ({ accessible: true, accessibilityRole: "image", accessibilityLabel: label } as const)
    : ({ accessible: false, importantForAccessibility: "no-hide-descendants" } as const);

  return (
    <View
      testID={testID}
      {...a11y}
      style={styles.caja}
      onLayout={(e: LayoutChangeEvent) => setAncho(Math.round(e.nativeEvent.layout.width))}
    >
      {ancho > 0 && linea ? (
        <Svg width={ancho} height={height}>
          {lavado ? <Path d={lavado} fill={color} fillOpacity={0.1} /> : null}
          <Path d={linea} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {ultimo >= 0 ? (
            <Circle cx={x(ultimo)} cy={y(values[ultimo] as number)} r={4} fill={color} stroke={fondo} strokeWidth={2} />
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ caja: { width: "100%" } });
