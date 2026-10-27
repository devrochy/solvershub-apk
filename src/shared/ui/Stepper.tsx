import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { useKit, type KitTema } from "./tema";

export type StepState = "upcoming" | "current" | "complete" | "error";

export interface StepItem {
  id: string;
  title: string;
  state: StepState;
}

export interface StepperProps {
  steps: StepItem[];
  /** Nombre accesible del indicador (qué proceso avanza), p. ej. «Crear agente». */
  label: string;
  testID?: string;
}

const ESCALA_MAXIMA = 1.6;
const MARCADOR = 24;

/** Posición (base 1) del paso activo: el `current`; si no hay, el primero sin completar. */
export function pasoActual(steps: StepItem[]): number {
  const actual = steps.findIndex((s) => s.state === "current");
  if (actual >= 0) return actual + 1;
  const pendiente = steps.findIndex((s) => s.state !== "complete");
  return pendiente >= 0 ? pendiente + 1 : steps.length;
}

/** «Paso 2 de 5» (con el título del paso activo, si lo hay). */
export function textoPaso(steps: StepItem[]): string {
  const n = pasoActual(steps);
  return `Paso ${n} de ${steps.length}`;
}

/** Números (base 1) de los pasos con error. */
function pasosConError(steps: StepItem[]): number[] {
  return steps.flatMap((s, i) => (s.state === "error" ? [i + 1] : []));
}

function lista(numeros: number[]): string {
  return numeros.length > 1 ? `${numeros.slice(0, -1).join(", ")} y ${numeros[numeros.length - 1]}` : String(numeros[0]);
}

function colores(kit: KitTema, state: StepState) {
  const { c, tonos } = kit;
  switch (state) {
    case "complete":
      return { fondo: tonos.success.bg, borde: tonos.success.border, tinta: tonos.success.fg, grosor: 1 };
    case "error":
      return { fondo: tonos.danger.bg, borde: tonos.danger.fg, tinta: tonos.danger.fg, grosor: 2 };
    case "current":
      return { fondo: c.surface, borde: c.focus, tinta: c.text, grosor: 2 };
    case "upcoming":
      return { fondo: c.surface, borde: c.controlBorder, tinta: c.textMuted, grosor: 1 };
  }
}

/**
 * Indicador «paso X de N» de un asistente (SPEC-29 §2, mismos nombres y estados
 * que el `Stepper` del panel). Arriba el texto «Paso 2 de 5» con el título del
 * paso activo; abajo una fila de marcadores que cabe en un teléfono con hasta 10
 * pasos. El estado nunca va solo en el color: completo lleva palomita, con error
 * una «!», el activo y los pendientes su número. Todo el indicador es un solo
 * elemento accesible que dice el paso actual y cuáles tienen error.
 */
export function Stepper({ steps, label, testID }: StepperProps) {
  const kit = useKit();
  if (steps.length === 0) return null;
  const { c, tonos } = kit;
  const n = pasoActual(steps);
  const activo = steps[n - 1];
  const errores = pasosConError(steps);
  const resumen = `${textoPaso(steps)}${activo ? `: ${activo.title}` : ""}`;
  const aviso = errores.length
    ? `${errores.length > 1 ? "Revisa los pasos" : "Revisa el paso"} ${lista(errores)}`
    : null;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}. ${resumen}${aviso ? `. ${aviso}` : ""}`}
      accessibilityValue={{ min: 1, max: steps.length, now: n }}
      style={styles.contenedor}
    >
      <View style={styles.encabezado}>
        <Text style={[shType.caption, { color: c.textMuted }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
          {textoPaso(steps)}
        </Text>
        {activo ? (
          <Text style={[shType.block, { color: c.text }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
            {activo.title}
          </Text>
        ) : null}
      </View>

      <View style={styles.marcadores}>
        {steps.map((paso, i) => {
          const col = colores(kit, paso.state);
          return (
            <View key={paso.id} style={[styles.celda, i < steps.length - 1 && styles.celdaConLinea]}>
              <View
                testID={`${testID ?? "stepper"}-${paso.id}`}
                style={[styles.marcador, { backgroundColor: col.fondo, borderColor: col.borde, borderWidth: col.grosor }]}
              >
                {paso.state === "complete" ? (
                  <Icono name="check" size={16} color={col.tinta} />
                ) : paso.state === "error" ? (
                  <Icono name="priority-high" size={16} color={col.tinta} />
                ) : (
                  <Text style={[styles.numero, { color: col.tinta }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < steps.length - 1 ? (
                <View
                  style={[
                    styles.linea,
                    { backgroundColor: paso.state === "complete" ? tonos.success.border : c.border },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {aviso ? (
        <View testID="stepper-aviso" style={styles.aviso}>
          <Icono name="error-outline" size={16} color={tonos.danger.fg} />
          <Text style={[shType.caption, styles.avisoTexto, { color: tonos.danger.fg }]} maxFontSizeMultiplier={ESCALA_MAXIMA}>
            {aviso}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  encabezado: { gap: 2 },
  marcadores: { flexDirection: "row", alignItems: "center" },
  celda: { flexDirection: "row", alignItems: "center" },
  celdaConLinea: { flex: 1 },
  marcador: {
    width: MARCADOR,
    height: MARCADOR,
    borderRadius: MARCADOR / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { ...shType.caption, fontFamily: shType.label.fontFamily },
  linea: { flex: 1, height: 2, marginHorizontal: shSpace[1] },
  aviso: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  avisoTexto: { flexShrink: 1 },
});
