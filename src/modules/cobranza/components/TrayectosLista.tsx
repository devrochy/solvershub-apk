import { useMemo } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, useKit, type ColoresKit } from "@shared/ui";
import { HeaderApp } from "./HeaderApp";
import type { ClienteTrayectoDiarioPublic, TrayectoPublic } from "@shared/types/gestor";
import { enlaceGoogleMapsCartera } from "../features/navegacion/navegacion";

export interface TrayectosListaProps {
  clientes: ClienteTrayectoDiarioPublic[];
  trayectos: TrayectoPublic;
}

function nombreDeParada(
  clientes: ClienteTrayectoDiarioPublic[],
  clienteId: string,
): string {
  return clientes.find((c) => c.clienteId === clienteId)?.nombre ?? `Cliente ${clienteId}`;
}

/**
 * Vista de los trayectos generados para el día (HU-55: hasta 9 paradas por
 * trayecto). Cada trayecto lista sus paradas en el orden óptimo y ofrece
 * navegación del trayecto completo en Google Maps (HU-37). Se muestra como
 * overlay en TrayectoDiarioScreen, que gestiona el cierre con swipe y el back físico.
 */
export function TrayectosLista({ clientes, trayectos }: TrayectosListaProps) {
  const { c } = useKit();
  const styles = useMemo(() => crearEstilos(c), [c]);
  return (
    <SafeAreaView testID="trayectos-lista" style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo="Trayectos del día"
        subtitulo={`${trayectos.ordenClientes.length} trayecto${
          trayectos.ordenClientes.length === 1 ? "" : "s"
        } · ${trayectos.distanciaEstimadaKm} km · ${trayectos.tiempoEstimadoMin} min`}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {trayectos.ordenClientes.map((trayecto, indice) => {
          const enlace = enlaceGoogleMapsCartera(trayecto);
          return (
            <View key={indice} style={styles.trayecto}>
              <View style={styles.trayectoFila}>
                <Text style={styles.trayectoTitulo}>Trayecto {indice + 1}</Text>
                <Text style={styles.paradasContador}>
                  {trayecto.length} parada{trayecto.length === 1 ? "" : "s"}
                </Text>
              </View>
              <View style={styles.paradas}>
                {trayecto.map((parada, pos) => (
                  <Text
                    key={`${parada.clienteId}-${pos}`}
                    style={styles.paradaNombre}
                  >
                    {pos + 1}. {nombreDeParada(clientes, parada.clienteId)}
                  </Text>
                ))}
              </View>
              {enlace ? (
                <Button
                  testID={`navegar-trayecto-${indice}`}
                  variant="secondary"
                  iconLeft="navigation"
                  fullWidth
                  style={styles.botonNavegar}
                  onPress={() => {
                    void Linking.openURL(enlace);
                  }}
                >
                  Navegar trayecto
                </Button>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c: ColoresKit) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    scroll: { padding: shSpace[4], gap: shSpace[3] },
    trayecto: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: shSpace[4],
      gap: shSpace[2],
    },
    trayectoFila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    trayectoTitulo: { ...shType.block, color: c.text },
    paradasContador: { ...shType.dense, color: c.textMuted },
    paradas: { gap: shSpace[1] },
    paradaNombre: { ...shType.body, color: c.text, flex: 1 },
    botonNavegar: { marginTop: shSpace[1] },
  });
}
