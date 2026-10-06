import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../session/session-context";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";
import { shColor } from "@core/theme/tokens";

const ROL_LABEL: Record<string, string> = {
  colaborador: "Colaborador",
  owner: "Propietario",
};

/**
 * Invitaciones pendientes (ADR-0081): el usuario sin membresías entra aquí, acepta
 * o rechaza, y al aceptar se re-loguea para entrar al negocio.
 */
export function InvitacionesScreen() {
  const { invitaciones, resolverInvitacion, logout } = useSession();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolver(id: string, accion: "aceptar" | "rechazar") {
    setEnviando(id);
    setError(null);
    try {
      await resolverInvitacion(id, accion);
    } catch {
      setError("No se pudo resolver la invitación. Intenta de nuevo.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Invitaciones</Text>
        <Text style={styles.subtitulo}>
          Te invitaron a unirte a un negocio. Acepta para acceder.
        </Text>

        <View style={styles.lista}>
          {invitaciones.map((inv) => (
            <View key={inv.id} testID={`invitacion-${inv.id}`} style={styles.tarjeta}>
              <View style={styles.tarjetaTexto}>
                <Text style={styles.negocioNombre}>{inv.nombre}</Text>
                <Text style={styles.negocioRol}>{ROL_LABEL[inv.rol] ?? inv.rol}</Text>
              </View>
              <View style={styles.acciones}>
                <Pressable
                  testID={`aceptar-${inv.id}`}
                  style={styles.boton}
                  disabled={enviando !== null}
                  onPress={() => void resolver(inv.id, "aceptar")}
                >
                  {enviando === inv.id ? (
                    <ActivityIndicator color={shColor.paper} />
                  ) : (
                    <Text style={styles.botonTexto}>Aceptar</Text>
                  )}
                </Pressable>
                <Pressable
                  testID={`rechazar-${inv.id}`}
                  style={styles.botonFantasma}
                  disabled={enviando !== null}
                  onPress={() => void resolver(inv.id, "rechazar")}
                >
                  <Text style={styles.botonFantasmaTexto}>Rechazar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {error ? (
          <Text testID="invitaciones-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable testID="salir" style={styles.salir} onPress={() => void logout()}>
          <Text style={styles.salirTexto}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.primario },
    scroll: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
    titulo: { color: shColor.white, fontSize: 24, fontWeight: "700", fontFamily: "Montserrat_700Bold" },
    subtitulo: { color: "rgba(255,255,255,0.8)", fontSize: 15, marginBottom: 12 },
    lista: { gap: 10 },
    tarjeta: {
      backgroundColor: c.tarjeta,
      borderRadius: 10,
      padding: 16,
      gap: 12,
    },
    tarjetaTexto: { gap: 2 },
    negocioNombre: { color: c.texto, fontSize: 16, fontWeight: "600" },
    negocioRol: { color: c.textoSuave, fontSize: 13 },
    acciones: { flexDirection: "row", gap: 8 },
    boton: {
      backgroundColor: c.acento,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    botonTexto: { color: shColor.paper, fontSize: 15, fontWeight: "700" },
    botonFantasma: {
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    botonFantasmaTexto: { color: c.textoSuave, fontSize: 15, fontWeight: "600" },
    error: { color: shColor.danger, fontSize: 14 },
    salir: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
    salirTexto: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  });
}
