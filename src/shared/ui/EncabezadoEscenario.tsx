import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { RutaDeEstaciones, type EstacionDeRuta } from "./RutaDeEstaciones";
import { useKit } from "./tema";

export interface EncabezadoEscenarioProps {
  /** Lo de la izquierda en la bienvenida (el logo); en Nuevo agente va ✕ con `onCerrar`. */
  marca?: ReactNode;
  /** Muestra ✕ («Cerrar») a la izquierda. */
  onCerrar?: () => void;
  /** «Nuevo agente · 2 de 5» o el nombre del agente, junto a la marca. */
  titulo?: string;
  /** Lo de la derecha: «Seguir después», la píldora del agente. */
  extremo?: ReactNode;
  /** El mini escenario de la estación (lo que el agente ya sabe, sus habilidades…). */
  children?: ReactNode;
  estaciones: readonly EstacionDeRuta[];
  actual: number;
  /** Alto de la barra de estado (`useSafeAreaInsets().top`). */
  insetSuperior?: number;
  testID?: string;
}

/**
 * Franja superior de la «Ruta de lanzamiento» (HU-APP-23, SPEC-49): siempre oscura, con la marca o ✕, el mini
 * escenario de la estación y la mini ruta de 5 puntos debajo. Sus colores son los roles `escenario` del tema.
 */
export function EncabezadoEscenario({
  marca,
  onCerrar,
  titulo,
  extremo,
  children,
  estaciones,
  actual,
  insetSuperior = 0,
  testID,
}: EncabezadoEscenarioProps) {
  const { escenario } = useKit();
  return (
    <View
      testID={testID}
      style={[styles.franja, { backgroundColor: escenario.fondo, paddingTop: insetSuperior + shSpace[2] }]}
    >
      <View style={styles.barra}>
        {onCerrar ? (
          <Pressable
            testID={testID ? `${testID}-cerrar` : undefined}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={onCerrar}
            hitSlop={4}
            style={styles.cerrar}
          >
            <Icono name="close" size={24} color={escenario.acento} />
          </Pressable>
        ) : null}
        {marca}
        {titulo ? (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[shType.label, styles.titulo, { color: escenario.texto }]}
          >
            {titulo}
          </Text>
        ) : (
          <View style={styles.titulo} />
        )}
        {extremo}
      </View>
      {children ? <View style={styles.escenario}>{children}</View> : null}
      <RutaDeEstaciones
        estaciones={estaciones}
        actual={actual}
        sobreEscenario
        testID={testID ? `${testID}-ruta` : undefined}
      />
    </View>
  );
}

/** Tarjeta sólida del escenario: una etiqueta y su valor (lo que el agente ya sabe). */
export function TarjetaDelEscenario({
  etiqueta,
  valor,
  hecha,
}: {
  etiqueta: string;
  valor: string;
  hecha: boolean;
}) {
  const { escenario } = useKit();
  return (
    <View
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}${hecha ? ", listo" : ", falta"}`}
      style={[styles.tarjeta, { backgroundColor: escenario.tarjeta, borderColor: hecha ? escenario.acento : escenario.borde }]}
    >
      <Text style={[shType.caption, { color: escenario.textoSuave }]} numberOfLines={1}>
        {etiqueta}
      </Text>
      <View style={styles.valor}>
        {hecha ? <Icono name="check" size={14} color={escenario.acento} /> : null}
        <Text style={[shType.caption, styles.texto, { color: escenario.texto }]} numberOfLines={2}>
          {valor}
        </Text>
      </View>
    </View>
  );
}

/** Píldora del agente: sus siglas en un círculo, su nombre y, si va, «Sugerido». */
export function PildoraDelAgente({ siglas, nombre, detalle }: { siglas: string; nombre: string; detalle?: string }) {
  const { escenario } = useKit();
  return (
    <View style={styles.pildora} accessible accessibilityLabel={[nombre, detalle].filter(Boolean).join(". ")}>
      <View style={[styles.siglas, { backgroundColor: escenario.tarjeta, borderColor: escenario.acento }]}>
        <Text style={[shType.label, { color: escenario.texto }]}>{siglas}</Text>
      </View>
      <View style={styles.texto}>
        <Text style={[shType.label, { color: escenario.texto }]} numberOfLines={1}>
          {nombre}
        </Text>
        {detalle ? (
          <Text style={[shType.caption, { color: escenario.textoSuave }]} numberOfLines={2}>
            {detalle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  franja: { gap: shSpace[3], paddingHorizontal: shSpace[4], paddingBottom: shSpace[3] },
  barra: { flexDirection: "row", alignItems: "center", gap: shSpace[3], minHeight: shDensity.controlLg },
  cerrar: { minWidth: shDensity.controlLg, minHeight: shDensity.controlLg, alignItems: "center", justifyContent: "center", marginLeft: -shSpace[3] },
  titulo: { flex: 1 },
  escenario: { gap: shSpace[2] },
  tarjeta: { flex: 1, gap: shSpace[1], padding: shSpace[2], borderWidth: 1, borderRadius: shRadius.sm },
  valor: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  texto: { flexShrink: 1 },
  pildora: { flexDirection: "row", alignItems: "center", gap: shSpace[3] },
  siglas: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
