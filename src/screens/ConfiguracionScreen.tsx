import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";

/**
 * Configuración de la app: información de la aplicación (nombre y versión).
 * El cierre de sesión vive en el header de la lista de rutas.
 */
export function ConfiguracionScreen() {
  const nombreApp = Constants.expoConfig?.name ?? "CobraIA";
  const version = Constants.expoConfig?.version ?? "—";

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila} testID="header-configuracion">
          <View style={estilosHeader.bloqueTitulo}>
            <Text style={estilosHeader.titulo}>Configuración</Text>
            <Text style={estilosHeader.subtitulo}>
              Información de la aplicación
            </Text>
          </View>
        </View>
      </HeaderPantalla>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tarjeta}>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Aplicación</Text>
            <Text testID="config-app" style={styles.valor}>
              {nombreApp}
            </Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Versión</Text>
            <Text testID="config-version" style={styles.valor}>
              {version}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16 },
  tarjeta: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
  },
  fila: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  etiqueta: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  valor: { fontSize: 14, color: "#0f172a", fontWeight: "700" },
});
