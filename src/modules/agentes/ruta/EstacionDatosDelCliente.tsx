import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import type { PropsDeEstacionDelAgente } from "@shared/ruta/estacion-del-agente";
import { Icono, useKit } from "@shared/ui";

/**
 * Estación 3, «Datos del cliente» (tableros `rb3`/`rn3`): PUNTO DE MONTAJE de HU-APP-24, que reemplaza este
 * archivo por `DatosDelClienteDelAgente` (`cargarDatosCliente`/`guardarDatosCliente`, «Cuánto pregunta» y los
 * niveles por campo). Mientras tanto no bloquea la ruta: el agente queda con lo justo (`por_defecto` de cada
 * campo, que el servidor ya aplica) y «Guardar y seguir» pasa a la estación 4 sin escribir nada.
 */
export function EstacionDatosDelCliente({ agenteId, nombre, registrarGuardar, onResumen }: PropsDeEstacionDelAgente) {
  const { c } = useKit();
  useEffect(() => {
    registrarGuardar(async () => true);
    onResumen("datos-cliente", "«Lo justo»");
    return () => registrarGuardar(null);
  }, [agenteId, registrarGuardar, onResumen]);
  return (
    <View style={styles.estacion} testID="estacion-datos-cliente">
      <View style={styles.fila}>
        <Icono name="badge" size={20} color={c.textMuted} />
        <Text style={[shType.body, styles.flex, { color: c.text }]}>
          {nombre} pide lo justo para atender a cada cliente: lo recomendado por SolversHub para su tipo.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  estacion: { gap: shSpace[3] },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  flex: { flexShrink: 1 },
});
