import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { Skeleton } from "./Skeleton";
import { useKit } from "./tema";

export type KpiPolarity = "up-good" | "up-bad";

export interface KpiTileProps {
  label: string;
  /** Cifra ya formateada ("$ 1.250.000"). */
  value: string;
  /** Variación porcentual frente al período anterior (12 = +12 %). */
  delta?: number;
  /** Con qué se compara: "frente a los 7 días anteriores". */
  period?: string;
  /** Aclaración corta bajo la cifra ("Últimos 7 días"). */
  hint?: string;
  /** Si subir es bueno (recaudo) o malo (mora). Por defecto `up-good`. */
  polarity?: KpiPolarity;
  loading?: boolean;
  /** Qué pasó al cargar la cifra. */
  error?: string;
  onPress?: () => void;
  testID?: string;
}

const formato = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** Delta escrito: "+12 % frente a …", "−3,5 %", "Sin cambio frente a …". */
export function formatearDelta(delta: number, periodo?: string): string {
  const cola = periodo ? ` ${periodo}` : "";
  if (delta === 0) return `Sin cambio${cola}`;
  const signo = delta > 0 ? "+" : "−";
  return `${signo}${formato.format(Math.abs(delta))} %${cola}`;
}

function deltaHablado(delta: number, periodo?: string): string {
  const cola = periodo ? ` ${periodo}` : "";
  if (delta === 0) return `Sin cambio${cola}`;
  return `${delta > 0 ? "Sube" : "Baja"} ${formato.format(Math.abs(delta))} %${cola}`;
}

/**
 * Tarjeta de métrica (SPEC-29 §2, `KpiTile`; en el panel, `StatCard`). El delta
 * se escribe y lleva flecha: el color (favorable o no según `polarity`) es
 * secundario. La cifra usa `tabular-nums` y escala hasta 1,6×.
 */
export function KpiTile({
  label,
  value,
  delta,
  period,
  hint,
  polarity = "up-good",
  loading = false,
  error,
  onPress,
  testID,
}: KpiTileProps) {
  const { c, tonos, ripple } = useKit();
  const hayDelta = delta !== undefined && !loading && !error;
  const favorable = hayDelta && ((delta > 0 && polarity === "up-good") || (delta < 0 && polarity === "up-bad"));
  const colorDelta = !hayDelta || delta === 0 ? c.textMuted : favorable ? tonos.success.fg : tonos.danger.fg;
  const flecha = !hayDelta ? null : delta > 0 ? "arrow-upward" : delta < 0 ? "arrow-downward" : "remove";

  const nombre = loading
    ? `${label}: cargando`
    : error
      ? `${label}: ${error}`
      : [`${label}: ${value}`, hayDelta ? deltaHablado(delta, period) : null, hint ?? null]
          .filter(Boolean)
          .join(". ");

  const contenido = (
    <>
      <Text style={[shType.label, { color: c.textMuted }]}>{label}</Text>
      {loading ? (
        <View style={styles.esqueleto}>
          <Skeleton shape="rect" height={shType.hero.lineHeight} width="60%" />
        </View>
      ) : error ? (
        <View style={styles.fila}>
          <Icono name="error-outline" size={18} color={tonos.danger.fg} />
          <Text style={[shType.dense, styles.flex, { color: tonos.danger.fg }]}>{error}</Text>
        </View>
      ) : (
        <Text maxFontSizeMultiplier={1.6} style={[shType.hero, styles.cifra, { color: c.textStrong }]}>
          {value}
        </Text>
      )}
      {hint && !loading && !error ? (
        <Text maxFontSizeMultiplier={1.6} style={[shType.caption, { color: c.textMuted }]}>
          {hint}
        </Text>
      ) : null}
      {hayDelta && flecha ? (
        <View style={styles.fila}>
          <Icono name={flecha} size={16} color={colorDelta} />
          <Text maxFontSizeMultiplier={1.6} style={[shType.caption, styles.flex, { color: colorDelta }]}>
            {formatearDelta(delta, period)}
          </Text>
        </View>
      ) : null}
    </>
  );

  const caja = [styles.caja, { backgroundColor: c.surface, borderColor: c.borderSoft }];
  const a11y = {
    testID,
    accessible: true,
    accessibilityLabel: nombre,
    accessibilityState: { busy: loading },
  };

  if (!onPress) {
    return (
      <View {...a11y} style={caja}>
        {contenido}
      </View>
    );
  }
  return (
    <Pressable
      {...a11y}
      accessibilityRole="button"
      onPress={onPress}
      android_ripple={{ color: ripple.superficie }}
      style={({ pressed }) => [...caja, pressed && Platform.OS === "ios" && { backgroundColor: c.hover }]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[4],
    gap: shSpace[1],
    overflow: "hidden",
  },
  esqueleto: { paddingVertical: shSpace[1] },
  cifra: { fontVariant: ["tabular-nums"] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  flex: { flexShrink: 1 },
});
