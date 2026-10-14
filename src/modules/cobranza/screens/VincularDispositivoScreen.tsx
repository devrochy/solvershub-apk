import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiErrorStatus } from "@core/api/client";
import {
  guardarWhatsappVinculacion,
  imeiDelEquipo,
  leerWhatsappVinculacion,
} from "@shared/dispositivo";
import { useSession } from "../session/session-context";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";
import { useKit, type KitTema } from "@shared/ui";

/**
 * HU-39/43: vincula este equipo al gestor. El equipo queda **pendiente** de
 * aprobación del administrador; mientras tanto el gestor puede operar (no bloqueante).
 */
export function VincularDispositivoScreen() {
  const { api, marcarDispositivoVinculado, logout, gestor } = useSession();
  const { colores } = useTheme();
  const { relleno } = useKit();
  const styles = useMemo(() => crearEstilos(colores, relleno), [colores, relleno]);
  const [imei, setImei] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [estado, setEstado] = useState<"form" | "enviando" | "pendiente">("form");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setImei(await imeiDelEquipo());
      setWhatsapp(await leerWhatsappVinculacion());
    })();
  }, []);

  async function vincular() {
    if (!whatsapp.trim()) {
      setError("Ingresa tu WhatsApp.");
      return;
    }
    setError(null);
    setEstado("enviando");
    try {
      await guardarWhatsappVinculacion(whatsapp.trim());
      await api.vincularDispositivo({ imei, whatsapp: whatsapp.trim() });
      setEstado("pendiente");
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
        return;
      }
      setError("No se pudo enviar la solicitud. Intenta de nuevo.");
      setEstado("form");
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.cuerpo}>
          <Text style={styles.titulo}>Vincular este dispositivo</Text>
          <Text style={styles.subtitulo}>
            {gestor ? `Hola ${gestor.nombre}. ` : ""}
            Por seguridad, el administrador debe aprobar este equipo.
          </Text>

          {estado === "pendiente" ? (
            <>
              <Text testID="vincular-pendiente" style={styles.ok}>
                Solicitud enviada. Un administrador debe aprobar este equipo.
                Puedes seguir operando mientras tanto.
              </Text>
              <Pressable
                testID="vincular-continuar"
                style={styles.boton}
                onPress={marcarDispositivoVinculado}
              >
                <Text style={styles.botonTexto}>Continuar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>Identificador del equipo</Text>
              <Text testID="vincular-imei" style={styles.valor}>
                {imei || "no disponible"}
              </Text>

              <Text style={styles.label}>WhatsApp</Text>
              <TextInput
                testID="vincular-whatsapp"
                style={styles.input}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="3001234567"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              {error ? (
                <Text testID="vincular-error" style={styles.error}>
                  {error}
                </Text>
              ) : null}

              <Pressable
                testID="vincular-enviar"
                style={[styles.boton, estado === "enviando" && styles.deshabilitado]}
                disabled={estado === "enviando"}
                onPress={() => void vincular()}
              >
                {estado === "enviando" ? (
                  <ActivityIndicator color={relleno.sobrePrimario} />
                ) : (
                  <Text style={styles.botonTexto}>Enviar solicitud</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable testID="vincular-salir" onPress={() => void logout()}>
            <Text style={styles.salir}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function crearEstilos(c: ColoresTema, relleno: KitTema["relleno"]) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.fondo },
    flex: { flex: 1 },
    cuerpo: { flex: 1, padding: 24, justifyContent: "center", gap: 10 },
    titulo: { fontSize: 22, fontWeight: "700", color: c.texto },
    subtitulo: { fontSize: 14, color: c.textoSuave, marginBottom: 8 },
    label: { fontSize: 13, fontWeight: "600", color: c.textoSuave, marginTop: 8 },
    valor: { fontSize: 15, color: c.texto, fontWeight: "600" },
    input: {
      borderWidth: 1,
      borderColor: c.borde,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: c.texto,
      backgroundColor: c.tarjeta,
    },
    error: { color: c.peligro, fontSize: 13 },
    ok: { color: c.exito, fontSize: 14, marginVertical: 8 },
    boton: {
      backgroundColor: relleno.primario,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
      minHeight: 44,
      justifyContent: "center",
    },
    botonTexto: { color: relleno.sobrePrimario, fontWeight: "700" },
    deshabilitado: { opacity: 0.6 },
    salir: { color: c.acento, textAlign: "center", marginTop: 16, fontWeight: "600" },
  });
}
