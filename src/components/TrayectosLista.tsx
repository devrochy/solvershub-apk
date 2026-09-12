import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderPantalla, estilosHeader } from "./HeaderPantalla";
import type { ClienteDiaPublic, TrayectoPublic } from "../types/cobrador";
import { enlaceGoogleMapsRuta } from "../features/navegacion/navegacion";

export interface TrayectosListaProps {
  clientes: ClienteDiaPublic[];
  trayectos: TrayectoPublic;
}

function nombreDeParada(
  clientes: ClienteDiaPublic[],
  clienteId: number,
): string {
  return clientes.find((c) => c.clienteId === clienteId)?.nombre ?? `Cliente ${clienteId}`;
}

/**
 * Vista de los trayectos generados para el día (HU-55: hasta 9 paradas por
 * trayecto). Cada trayecto lista sus paradas en el orden óptimo y ofrece
 * navegación del trayecto completo en Google Maps (HU-37). Se muestra como
 * overlay en DiaScreen, que gestiona el cierre con swipe y el back físico.
 */
export function TrayectosLista({ clientes, trayectos }: TrayectosListaProps) {
  return (
    <SafeAreaView testID="trayectos-lista" style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila}>
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>Trayectos del día</Text>
            <Text style={estilosHeader.subtitulo}>
              {trayectos.ordenClientes.length} trayecto
              {trayectos.ordenClientes.length === 1 ? "" : "s"} ·{" "}
              {trayectos.distanciaEstimadaKm} km · {trayectos.tiempoEstimadoMin} min
            </Text>
          </View>
        </View>
      </HeaderPantalla>

      <ScrollView contentContainerStyle={styles.scroll}>
        {trayectos.ordenClientes.map((trayecto, indice) => {
          const enlace = enlaceGoogleMapsRuta(trayecto);
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

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16, gap: 12 },
  trayecto: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 8,
  },
  trayectoFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trayectoTitulo: { fontSize: 15, fontWeight: "700", color: "#334155" },
  paradasContador: { color: "#64748b", fontSize: 13 },
  paradas: { gap: 4 },
  paradaNombre: { color: "#334155", fontSize: 14, flex: 1 },
  botonNavegar: {
    backgroundColor: "#0e7490",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4,
  },
  botonNavegarTexto: { color: "#ffffff", fontWeight: "600" },
});