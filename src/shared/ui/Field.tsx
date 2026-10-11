import { createContext, useContext, useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Icono } from "./icono";
import { useKit } from "./tema";

/** Lo que un control del kit recibe del `Field` que lo envuelve. */
export interface FieldContexto {
  label: string;
  required: boolean;
  invalid: boolean;
  /** Error (si hay) o ayuda: va al `accessibilityHint` del control. */
  descripcion?: string;
}

const FieldContext = createContext<FieldContexto | null>(null);

/** Contexto del `Field` más cercano (null si el control va suelto). */
export function useField(): FieldContexto | null {
  return useContext(FieldContext);
}

/** Nombre accesible de un control dentro de un `Field`. */
export function nombreDeCampo(ctx: FieldContexto): string {
  return ctx.required ? `${ctx.label}, obligatorio` : ctx.label;
}

export interface FieldProps {
  label: string;
  hint?: string;
  /** Mensaje que dice qué pasó y cómo seguir. Marca el control como inválido. */
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  testID?: string;
}

/**
 * Une label, control, ayuda y error (SPEC-29 §2, molécula `Field`). El label y
 * la ayuda visibles se ocultan al lector de pantalla porque el control del kit
 * (`TextField`) los recibe por contexto como nombre y pista: así TalkBack los
 * lee una sola vez, al enfocar el control. El error sí se anuncia al aparecer
 * (región viva). Un control propio debe leer `useField()` para lo mismo.
 */
export function Field({ label, hint, error, required = false, children, testID }: FieldProps) {
  const { c } = useKit();
  const ctx = useMemo<FieldContexto>(
    () => ({ label, required, invalid: Boolean(error), descripcion: error || hint || undefined }),
    [label, required, error, hint],
  );

  return (
    <FieldContext.Provider value={ctx}>
      <View style={styles.contenedor} testID={testID}>
        <View
          style={styles.fila}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[shType.label, { color: c.text }]}>{label}</Text>
          {required ? <Text style={[shType.label, { color: c.statusDangerFg }]}>*</Text> : null}
        </View>
        {children}
        {hint && !error ? (
          <Text
            style={[shType.caption, { color: c.textMuted }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {hint}
          </Text>
        ) : null}
        {error ? (
          <View testID="field-error" style={styles.fila} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icono name="error-outline" size={16} color={c.statusDangerFg} />
            <Text style={[shType.caption, styles.error, { color: c.statusDangerFg }]}>{error}</Text>
          </View>
        ) : null}
      </View>
    </FieldContext.Provider>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[1] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  error: { flexShrink: 1 },
});
