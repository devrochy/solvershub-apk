import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit } from "./tema";

export interface ElegibleProps {
  titulo: string;
  ayuda?: string;
  icono?: IconName;
  elegido: boolean;
  onPress: () => void;
  /** `radio` para una sola opción, `checkbox` para varias. */
  rol?: "radio" | "checkbox";
  /** Marca en palabra sobre la tarjeta («Recomendado», «Sugerido»): nunca solo color. */
  etiqueta?: string;
  /** La opción no se puede elegir; `nota` dice por qué (tipo ocupado, no está en tu servicio). */
  deshabilitado?: boolean;
  nota?: string;
  /** Acción propia de la tarjeta deshabilitada («Editar a Laura», «Desarchívalo»). */
  accion?: ReactNode;
  /** Baldosa para la grilla de dos columnas (ícono arriba a la izquierda, texto corto). */
  baldosa?: boolean;
  testID?: string;
}

/**
 * Tarjeta seleccionable de la ruta (HU-APP-23; antes en el módulo onboarding): toda la tarjeta es el blanco
 * táctil (≥ 48 dp). Lo elegido se ve por el borde, el fondo y la palomita —no solo por el color— y el lector de
 * pantalla lo anuncia con su rol y estado. Deshabilitada lleva borde punteado y su nota.
 */
export function Elegible({
  titulo,
  ayuda,
  icono,
  elegido,
  onPress,
  rol = "radio",
  etiqueta,
  deshabilitado = false,
  nota,
  accion,
  baldosa = false,
  testID,
}: ElegibleProps) {
  const { c, relleno, ripple, tonos } = useKit();
  const pista = [etiqueta, ayuda, deshabilitado ? nota : undefined].filter(Boolean).join(". ") || undefined;
  return (
    <View style={baldosa ? styles.envolturaBaldosa : undefined}>
      <Pressable
        testID={testID}
        accessibilityRole={rol}
        accessibilityLabel={titulo}
        accessibilityHint={pista}
        accessibilityState={{ selected: elegido, checked: elegido, disabled: deshabilitado }}
        disabled={deshabilitado}
        onPress={onPress}
        android_ripple={{ color: ripple.superficie }}
        style={({ pressed }) => [
          styles.tarjeta,
          baldosa && styles.baldosa,
          {
            borderColor: elegido ? relleno.primario : c.controlBorder,
            backgroundColor: elegido ? tonos.accent.bg : c.surface,
          },
          deshabilitado && styles.deshabilitada,
          pressed && Platform.OS === "ios" && styles.presionada,
        ]}
      >
        {icono ? (
          <View style={[styles.icono, { backgroundColor: elegido ? tonos.accent.border : c.surface2 }]}>
            <Icono name={icono} size={22} color={elegido ? c.link : c.textMuted} />
          </View>
        ) : null}
        <View style={styles.textos}>
          <Text style={[shType.label, { color: deshabilitado ? c.textMuted : c.text }]}>{titulo}</Text>
          {ayuda ? <Text style={[shType.caption, { color: c.textMuted }]}>{ayuda}</Text> : null}
          {deshabilitado && nota ? (
            <Text style={[shType.caption, { color: c.text }]} testID={testID ? `${testID}-nota` : undefined}>
              {nota}
            </Text>
          ) : null}
        </View>
        {elegido ? <Icono name="check-circle" size={22} color={c.link} /> : null}
        {etiqueta ? (
          <View
            style={[styles.etiqueta, { borderColor: c.link, backgroundColor: c.surface }]}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={[shType.caption, styles.textoEtiqueta, { color: c.link }]}>{etiqueta}</Text>
          </View>
        ) : null}
      </Pressable>
      {accion ? <View style={styles.accion}>{accion}</View> : null}
    </View>
  );
}

export interface ChipProps {
  titulo: string;
  elegido: boolean;
  onPress: () => void;
  rol?: "radio" | "checkbox" | "button";
  /** Inicial en un círculo (ideas de nombre). */
  inicial?: string;
  testID?: string;
}

/** Variante compacta (chip) para elecciones cortas: ideas de nombre, frases de prueba. */
export function Chip({ titulo, elegido, onPress, rol = "checkbox", inicial, testID }: ChipProps) {
  const { c, relleno, ripple, tonos } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={rol}
      accessibilityLabel={titulo}
      accessibilityState={rol === "button" ? undefined : { selected: elegido, checked: elegido }}
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={[
        styles.chip,
        {
          borderColor: elegido ? relleno.primario : c.controlBorder,
          backgroundColor: elegido ? tonos.accent.bg : c.surface,
        },
      ]}
    >
      {elegido ? (
        <Icono name="check-circle" size={20} color={c.link} />
      ) : inicial ? (
        <View style={[styles.inicial, { backgroundColor: c.surface2 }]}>
          <Text style={[shType.caption, { color: c.link }]}>{inicial}</Text>
        </View>
      ) : null}
      <Text style={[shType.label, { color: c.text }]}>{titulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg + shSpace[2],
    padding: shSpace[3],
    borderWidth: 2,
    borderRadius: shRadius.md,
  },
  envolturaBaldosa: { flexBasis: "47%", flexGrow: 1 },
  baldosa: { gap: shSpace[2], padding: shSpace[2] },
  deshabilitada: { borderStyle: "dashed" },
  presionada: { opacity: 0.85 },
  icono: { width: 40, height: 40, borderRadius: shRadius.sm, alignItems: "center", justifyContent: "center" },
  textos: { flex: 1, gap: shSpace[1] },
  etiqueta: {
    position: "absolute",
    top: -11,
    right: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[2],
  },
  textoEtiqueta: { fontFamily: shType.label.fontFamily },
  accion: { alignItems: "flex-start", paddingTop: shSpace[1] },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[3],
    borderWidth: 2,
    borderRadius: shRadius.pill,
  },
  inicial: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
