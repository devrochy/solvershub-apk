import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, IconButton, useKit } from "@shared/ui";

import { mesYAnio, nombreDiaCorto, type DiaDeSemana } from "../domain/zona";

/** Tira de la semana: 7 días, el seleccionado y cuántos eventos tiene cada uno. */
export function TiraSemana({
  dias,
  seleccionado,
  conteo,
  onSeleccionar,
  onAnterior,
  onSiguiente,
  onHoy,
  testID = "agenda-semana",
}: {
  dias: DiaDeSemana[];
  seleccionado: string;
  conteo: Record<string, number>;
  onSeleccionar: (clave: string) => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  onHoy: () => void;
  testID?: string;
}) {
  const { c } = useKit();
  const titulo = dias.length ? mesYAnio(dias[0].clave) : "";

  return (
    <View testID={testID} style={styles.contenedor}>
      <View style={styles.encabezado}>
        <IconButton icon="chevron-left" label="Semana anterior" onPress={onAnterior} />
        <Text accessibilityRole="header" style={[shType.block, styles.titulo, { color: c.text }]}>
          {titulo}
        </Text>
        <IconButton icon="chevron-right" label="Semana siguiente" onPress={onSiguiente} />
        <Button variant="ghost" size="sm" onPress={onHoy}>
          Hoy
        </Button>
      </View>

      <View style={styles.dias}>
        {dias.map((dia) => {
          const activo = dia.clave === seleccionado;
          const cuantos = conteo[dia.clave] ?? 0;
          return (
            <Pressable
              key={dia.clave}
              testID={`${testID}-dia-${dia.clave}`}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={`${nombreDiaCorto(dia.diaSemana)} ${dia.dia}${cuantos ? `, ${cuantos} eventos` : ""}`}
              onPress={() => onSeleccionar(dia.clave)}
              style={[
                styles.dia,
                {
                  borderColor: activo ? c.link : "transparent",
                  backgroundColor: activo ? c.surfaceRaised : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  shType.caption,
                  { color: activo ? c.link : c.textMuted, textTransform: "capitalize" },
                ]}
              >
                {nombreDiaCorto(dia.diaSemana)}
              </Text>
              <Text style={[shType.block, styles.numero, { color: activo ? c.link : c.text }]}>
                {dia.dia}
              </Text>
              <View
                style={[
                  styles.punto,
                  { backgroundColor: cuantos ? c.link : "transparent", opacity: activo ? 1 : 0.65 },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  encabezado: { flexDirection: "row", alignItems: "center", gap: shSpace[1] },
  titulo: { flex: 1 },
  dias: { flexDirection: "row", gap: shSpace[1] },
  dia: {
    flex: 1,
    minHeight: shDensity.controlLg + shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingVertical: shSpace[1],
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  numero: { fontSize: 18, lineHeight: 22 },
  punto: { width: 5, height: 5, borderRadius: 3 },
});
