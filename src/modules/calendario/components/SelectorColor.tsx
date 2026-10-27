import { Pressable, StyleSheet, View } from "react-native";
import { shSpace } from "@core/theme/tokens";
import { Icono, useKit } from "@shared/ui";

import { COLORES_TIPO, type ColorTipo } from "../domain/agenda";

/** Elige uno de los 4 colores categóricos del sistema (nunca hex libre). */
export function SelectorColor({
  valor,
  onChange,
  testID = "selector-color",
}: {
  valor?: string | null;
  onChange: (color: ColorTipo) => void;
  testID?: string;
}) {
  const { c } = useKit();
  const colores = [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4];

  return (
    <View style={styles.fila} accessibilityRole="radiogroup" accessibilityLabel="Color">
      {COLORES_TIPO.map((opcion, indice) => {
        const activo = valor === opcion.valor;
        return (
          <Pressable
            key={opcion.valor}
            testID={`${testID}-${opcion.valor}`}
            accessibilityRole="radio"
            accessibilityLabel={opcion.nombre}
            accessibilityState={{ checked: activo }}
            onPress={() => onChange(opcion.valor)}
            style={[
              styles.opcion,
              {
                borderColor: activo ? c.text : c.controlBorder,
                backgroundColor: c.surface,
              },
            ]}
          >
            <View style={[styles.muestra, { backgroundColor: colores[indice] }]}>
              {activo ? <Icono name="check" size={14} color={c.surface} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: "row", gap: shSpace[3] },
  opcion: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  muestra: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
