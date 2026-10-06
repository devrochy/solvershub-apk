import { useMemo } from "react";
import { shColor } from "@core/theme/tokens";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderApp } from "./HeaderApp";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";
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
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
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
                <Pressable
                  testID={`navegar-trayecto-${indice}`}
                  style={styles.botonNavegar}
                  onPress={() => {
                    void Linking.openURL(enlace);
                  }}
                >
                  <Text style={styles.botonNavegarTexto}>Navegar trayecto</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.fondo },
    scroll: { padding: 16, gap: 12 },
    trayecto: {
      backgroundColor: c.tarjeta,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.borde,
      padding: 16,
      gap: 8,
    },
    trayectoFila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    trayectoTitulo: { fontSize: 15, fontWeight: "700", color: c.texto },
    paradasContador: { color: c.textoSuave, fontSize: 13 },
    paradas: { gap: 4 },
    paradaNombre: { color: c.texto, fontSize: 14, flex: 1 },
    botonNavegar: {
      backgroundColor: shColor.blue["600"],
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
      marginTop: 4,
    },
    botonNavegarTexto: { color: shColor.white, fontWeight: "600" },
  });
}