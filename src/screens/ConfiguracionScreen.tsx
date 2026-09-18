import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { BotonMenu } from "../components/BotonMenu";
import { HeaderPantalla, estilosHeader } from "../components/HeaderPantalla";
import { useOffline } from "../offline/offline-context";

function formatearUltimaSincronizacion(ts: number | null): string {
  return ts ? new Date(ts).toLocaleString("es") : "Nunca";
}

/**
 * Configuración de la app: información de la aplicación y estado/sincronización
 * manual (última sincronización, pendientes, sincronizar y sincronizar general).
 * El cierre de sesión vive en el header de la lista de carteras.
 */
export function ConfiguracionScreen() {
  const offline = useOffline();
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const nombreApp = Constants.expoConfig?.name ?? "CobraIA";
  const version = Constants.expoConfig?.version ?? "—";

  async function ejecutar(accion: () => Promise<void>, ok: string) {
    setSincronizando(true);
    setMensaje(null);
    try {
      await accion();
      setMensaje({ texto: ok, error: false });
    } catch {
      setMensaje({
        texto: "No se pudo sincronizar. Verifica la conexión y la clave del dispositivo.",
        error: true,
      });
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right"]}>
      <HeaderPantalla>
        <View style={estilosHeader.fila} testID="header-configuracion">
          <BotonMenu />
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

        <Text style={styles.seccionTitulo}>Sincronización</Text>
        <View style={styles.tarjeta}>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Última sincronización</Text>
            <Text testID="sync-ultima" style={styles.valor}>
              {formatearUltimaSincronizacion(offline.ultimaSincronizacion)}
            </Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.etiqueta}>Pendientes</Text>
            <Text testID="sync-pendientes" style={styles.valor}>
              {offline.sinSubir}
            </Text>
          </View>
          <View style={styles.filaBotones}>
            <Pressable
              testID="btn-sincronizar"
              style={[styles.boton, sincronizando && styles.botonDeshabilitado]}
              disabled={sincronizando}
              onPress={() => void ejecutar(() => offline.sincronizar(), "Sincronizado.")}
            >
              <Text style={styles.botonTexto}>Sincronizar</Text>
            </Pressable>
            <Pressable
              testID="btn-sincronizar-general"
              style={[styles.boton, sincronizando && styles.botonDeshabilitado]}
              disabled={sincronizando}
              onPress={() =>
                void ejecutar(
                  () => offline.sincronizarGeneral(),
                  "Sincronizado y datos actualizados.",
                )
              }
            >
              <Text style={styles.botonTexto}>Sincronizar general</Text>
            </Pressable>
          </View>
          {sincronizando ? <ActivityIndicator style={styles.cargando} /> : null}
          {mensaje ? (
            <Text
              testID="sync-mensaje"
              style={[styles.mensaje, mensaje.error ? styles.mensajeError : styles.mensajeOk]}
            >
              {mensaje.texto}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16 },
  seccionTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 16,
    marginBottom: 8,
  },
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
  filaBotones: { flexDirection: "row", gap: 12, paddingVertical: 14 },
  boton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#172f6c",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: "#172f6c", fontWeight: "600" },
  cargando: { marginBottom: 12 },
  mensaje: { fontSize: 13, fontWeight: "500", marginBottom: 12 },
  mensajeOk: { color: "#15803d" },
  mensajeError: { color: "#b91c1c" },
});
