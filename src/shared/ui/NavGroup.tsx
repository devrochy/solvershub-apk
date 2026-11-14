import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit } from "./tema";

export interface NavGroupProps {
  label: string;
  icon?: IconName;
  abierto: boolean;
  onToggle: () => void;
  /** Grupo de un pack no habilitado: candado, sin desplegar. */
  bloqueado?: boolean;
  /** Resumen bajo el título mientras el grupo está plegado (p. ej. dos cifras); abierto ya no se ve. */
  resumen?: ReactNode;
  /** Lo mismo que `resumen`, dicho en voz alta (se añade al nombre accesible del grupo plegado). */
  resumenHablado?: string;
  children?: ReactNode;
  testID?: string;
}

/**
 * Cabecera de grupo plegable de un menú (cajón del panel en la app), como los
 * grupos del sidebar web: 48 dp, `aria-expanded`, chevron y candado si el pack
 * no está habilitado. Los hijos (filas `ListItem`) solo se montan abiertos.
 */
export function NavGroup({
  label,
  icon,
  abierto,
  onToggle,
  bloqueado = false,
  resumen,
  resumenHablado,
  children,
  testID,
}: NavGroupProps) {
  const { c, ripple } = useKit();
  const desplegado = abierto && !bloqueado;
  return (
    <View>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={resumenHablado && !desplegado ? `${label}. ${resumenHablado}` : label}
        accessibilityState={{ expanded: desplegado, disabled: bloqueado }}
        disabled={bloqueado}
        android_ripple={{ color: ripple.superficie }}
        onPress={onToggle}
        style={styles.cabecera}
      >
        {icon ? <Icono name={icon} size={20} color={bloqueado ? c.textSoft : c.link} /> : null}
        <View style={styles.texto}>
          <Text style={[styles.titulo, { color: bloqueado ? c.textSoft : c.text }]}>{label}</Text>
          {resumen && !desplegado ? <View style={styles.resumen}>{resumen}</View> : null}
        </View>
        {bloqueado ? <Icono name="lock" size={18} color={c.textSoft} /> : null}
        <Icono name={desplegado ? "expand-more" : "chevron-right"} size={22} color={c.textSoft} />
      </Pressable>
      {desplegado ? <View style={styles.hijos}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[2],
    borderRadius: shRadius.md,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  texto: { flex: 1, paddingVertical: shSpace[1] },
  titulo: {
    ...shType.label,
    fontFamily: shType.hero.fontFamily,
  },
  resumen: { marginTop: 2 },
  hijos: { paddingLeft: shSpace[2], paddingBottom: shSpace[2], gap: 2 },
});
