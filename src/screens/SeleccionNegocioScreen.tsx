import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "../session/session-context";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";
import { shColor } from "@core/theme/tokens";

const ROL_LABEL: Record<string, string> = {
  gestor: "Gestor",
  propietario: "Propietario",
  master: "Administrador",
};

/** Selector de negocio (ADR-0081): aparece solo si el usuario pertenece a más de uno. */
export function SeleccionNegocioScreen() {
  const { negociosPendientes, seleccionarNegocio, logout } = useSession();
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function elegir(slug: string) {
    setEnviando(slug);
    try {
      await seleccionarNegocio(slug);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>Elige un negocio</Text>
        <Text style={styles.subtitulo}>
          Tu cuenta tiene acceso a varios negocios. Selecciona con cuál vas a trabajar.
        </Text>

        <View style={styles.lista}>
          {negociosPendientes.map((n) => (
            <Pressable
              key={n.slug}
              testID={`negocio-${n.slug}`}
              style={styles.tarjeta}
              disabled={enviando !== null}
              onPress={() => elegir(n.slug)}
            >
              <View style={styles.tarjetaTexto}>
                <Text style={styles.negocioNombre}>{n.nombre}</Text>
                <Text style={styles.negocioRol}>{ROL_LABEL[n.rol] ?? n.rol}</Text>
              </View>
              {enviando === n.slug ? (
                <ActivityIndicator color={colores.acento} />
              ) : (
                <Text style={styles.flecha}>›</Text>
              )}
            </Pressable>
          ))}
        </View>

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
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.tarjeta,
      borderRadius: 10,
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    tarjetaTexto: { gap: 2 },
    negocioNombre: { color: c.texto, fontSize: 16, fontWeight: "600" },
    negocioRol: { color: c.textoSuave, fontSize: 13 },
    flecha: { color: c.textoSuave, fontSize: 24, fontWeight: "700" },
    salir: { marginTop: 16, alignItems: "center", paddingVertical: 12 },
    salirTexto: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  });
}
