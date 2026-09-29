import { useMemo, useState } from "react";
import { shColor } from "../theme/tokens";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { useOffline } from "../offline/offline-context";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";

function formatearUltimaSincronizacion(ts: number | null): string {
  return ts ? new Date(ts).toLocaleString("es") : "Nunca";
}

/**
 * Configuración de la app: información de la aplicación y estado/sincronización
 * manual (última sincronización, pendientes, sincronizar y sincronizar general).
 * El cierre de sesión vive en el header de la lista de carteras.
 */
export function ConfiguracionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const offline = useOffline();
  const [sincronizando, setSincronizando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);
  const nombreApp = Constants.expoConfig?.name ?? "Solver";
  const version = Constants.expoConfig?.version ?? "—";
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);

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
    <VentanaCerrarConSwipe
      animarSalida={false}
      onCerrar={() => navigation.goBack()}
      style={styles.fill}
    >
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo="Configuración"
        subtitulo="Información de la aplicación"
      />

      <Breadcrumb seccion="Configuración" />

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

        {offline.eventosError.length > 0 ? (
          <>
            <Text style={styles.seccionTitulo}>Eventos con error</Text>
            <View style={styles.tarjeta}>
              {offline.eventosError.map((e) => (
                <View key={e.eventoIdCliente} style={styles.filaError}>
                  <View style={styles.errorTexto}>
                    <Text style={styles.errorTipo}>{e.tipoEvento}</Text>
                    <Text style={styles.errorDetalle} numberOfLines={2}>
                      {e.error}
                    </Text>
                  </View>
                  <View style={styles.errorAcciones}>
                    <Pressable
                      testID={`error-reintentar-${e.eventoIdCliente}`}
                      onPress={() => void offline.reintentarEvento(e.eventoIdCliente)}
                    >
                      <Text style={styles.botonTexto}>Reintentar</Text>
                    </Pressable>
                    <Pressable
                      testID={`error-descartar-${e.eventoIdCliente}`}
                      onPress={() => void offline.descartarEvento(e.eventoIdCliente)}
                    >
                      <Text style={styles.botonTextoPeligro}>Descartar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </VentanaCerrarConSwipe>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.fondo },
    fill: { flex: 1 },
    scroll: { padding: 16 },
    seccionTitulo: {
      fontSize: 13,
      fontWeight: "700",
      color: c.textoSuave,
      marginTop: 16,
      marginBottom: 8,
    },
    tarjeta: {
      backgroundColor: c.tarjeta,
      borderRadius: 14,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: c.borde,
      paddingHorizontal: 16,
    },
    fila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: c.fondo,
    },
    etiqueta: { fontSize: 14, color: c.textoSuave, fontWeight: "600" },
    valor: { fontSize: 14, color: c.texto, fontWeight: "700" },
    filaBotones: { flexDirection: "row", gap: 12, paddingVertical: 14 },
    boton: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.primario,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
    },
    botonDeshabilitado: { opacity: 0.5 },
    botonTexto: { color: c.acento, fontWeight: "600" },
    cargando: { marginBottom: 12 },
    mensaje: { fontSize: 13, fontWeight: "500", marginBottom: 12 },
    filaError: {
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: c.fondo,
      gap: 8,
    },
    errorTexto: { gap: 2 },
    errorTipo: { fontSize: 13, fontWeight: "700", color: c.texto },
    errorDetalle: { fontSize: 12, color: c.textoSuave },
    errorAcciones: { flexDirection: "row", gap: 20 },
    botonTextoPeligro: { color: shColor.danger, fontWeight: "600" },
    mensajeOk: { color: shColor.navy["900"] },
    mensajeError: { color: c.peligro },
  });
}
