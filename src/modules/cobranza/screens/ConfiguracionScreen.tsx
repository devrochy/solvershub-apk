import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, useKit, type ColoresKit } from "@shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { HeaderApp } from "../components/HeaderApp";
import { Breadcrumb } from "../components/Breadcrumb";
import { useOffline } from "../offline/offline-context";
import { VentanaCerrarConSwipe } from "../navigation/VentanaCerrarConSwipe";
import type { RootStackParamList } from "../navigation/types";

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
  const { c } = useKit();
  const styles = useMemo(() => crearEstilos(c), [c]);

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

        <Text accessibilityRole="header" style={styles.seccionTitulo}>Sincronización</Text>
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
            <Button
              testID="btn-sincronizar"
              variant="secondary"
              iconLeft="sync"
              fullWidth
              style={styles.boton}
              disabled={sincronizando}
              onPress={() => void ejecutar(() => offline.sincronizar(), "Sincronizado.")}
            >
              Sincronizar
            </Button>
            <Button
              testID="btn-sincronizar-general"
              variant="secondary"
              iconLeft="cloud-sync"
              fullWidth
              style={styles.boton}
              disabled={sincronizando}
              onPress={() =>
                void ejecutar(
                  () => offline.sincronizarGeneral(),
                  "Sincronizado y datos actualizados.",
                )
              }
            >
              Sincronizar general
            </Button>
          </View>
          {sincronizando ? <ActivityIndicator style={styles.cargando} color={c.link} /> : null}
          {mensaje ? (
            <View style={styles.filaMensaje} accessibilityLiveRegion="polite">
              <Icono
                name={mensaje.error ? "error-outline" : "check-circle"}
                size={18}
                color={mensaje.error ? c.statusDangerFg : c.statusSuccessFg}
              />
              <Text
                testID="sync-mensaje"
                style={[styles.mensaje, mensaje.error ? styles.mensajeError : styles.mensajeOk]}
              >
                {mensaje.texto}
              </Text>
            </View>
          ) : null}
        </View>

        {offline.eventosError.length > 0 ? (
          <>
            <Text accessibilityRole="header" style={styles.seccionTitulo}>Eventos con error</Text>
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
                    <Button
                      testID={`error-reintentar-${e.eventoIdCliente}`}
                      variant="secondary"
                      size="sm"
                      iconLeft="refresh"
                      onPress={() => void offline.reintentarEvento(e.eventoIdCliente)}
                    >
                      Reintentar
                    </Button>
                    <Button
                      testID={`error-descartar-${e.eventoIdCliente}`}
                      variant="danger"
                      size="sm"
                      iconLeft="delete-outline"
                      onPress={() => void offline.descartarEvento(e.eventoIdCliente)}
                    >
                      Descartar
                    </Button>
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

function crearEstilos(c: ColoresKit) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    fill: { flex: 1 },
    scroll: { padding: shSpace[4] },
    seccionTitulo: {
      ...shType.label,
      fontFamily: shType.block.fontFamily,
      color: c.textMuted,
      marginTop: shSpace[4],
      marginBottom: shSpace[2],
    },
    tarjeta: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: shSpace[4],
    },
    fila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // Sin espacio, la etiqueta y una fecha larga quedaban pegadas ("sincronización11/10…").
      gap: shSpace[3],
      minHeight: shDensity.rowComfortable,
      paddingVertical: shSpace[3],
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
    },
    etiqueta: { ...shType.label, color: c.textMuted, flexShrink: 1 },
    valor: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.text, fontVariant: ["tabular-nums"], flexShrink: 1, textAlign: "right" },
    filaBotones: { flexDirection: "row", gap: shSpace[3], paddingVertical: 14 },
    boton: { flex: 1 },
    cargando: { marginBottom: shSpace[3] },
    filaMensaje: { flexDirection: "row", alignItems: "center", gap: shSpace[2], marginBottom: shSpace[3] },
    mensaje: { ...shType.dense, flex: 1 },
    filaError: {
      paddingVertical: shSpace[3],
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
      gap: shSpace[2],
    },
    errorTexto: { gap: 2 },
    errorTipo: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.text },
    errorDetalle: { ...shType.caption, color: c.textMuted },
    errorAcciones: { flexDirection: "row", gap: shSpace[3] },
    mensajeOk: { color: c.statusSuccessFg },
    mensajeError: { color: c.statusDangerFg },
  });
}
