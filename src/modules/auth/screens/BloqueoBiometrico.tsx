import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@core/theme/theme-context";
import { autenticarBiometria, biometriaHabilitada } from "../biometria";

export interface BloqueoBiometricoProps {
  onDesbloqueado(): void;
}

/**
 * Puerta biométrica de la app (HU-APP-02): si el dispositivo tiene biometría
 * habilitada, la app no muestra contenido hasta autenticar. Se monta en la
 * composición (App), no en el módulo, porque decide el flujo general.
 */
export function useBloqueoBiometrico(bloqueoKey: string | null) {
  const [requerido, setRequerido] = useState(false);
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    let activo = true;
    biometriaHabilitada()
      .then((habilitada) => {
        if (activo) {
          setRequerido(habilitada);
          setVerificado(false);
        }
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [bloqueoKey]);

  return { requerido, verificado, marcarVerificado: useCallback(() => setVerificado(true), []) };
}

export function BloqueoBiometrico({ onDesbloqueado }: BloqueoBiometricoProps) {
  const { colores } = useTheme();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intentar = async () => {
    setCargando(true);
    setError(null);
    try {
      const ok = await autenticarBiometria("Desbloquea SolversHub");
      if (ok) {
        onDesbloqueado();
      } else {
        setError("No pudimos verificar tu identidad.");
      }
    } catch {
      setError("Biometría no disponible en este momento.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <Text style={[styles.titulo, { color: colores.texto }]}>SolversHub</Text>
      <Text style={[styles.explicacion, { color: colores.textoSuave }]}>
        Verifica tu identidad para continuar.
      </Text>
      <Pressable
        testID="bloqueo-desbloquear"
        onPress={() => void intentar()}
        style={({ pressed }) => [styles.boton, { backgroundColor: colores.primario }, pressed && styles.presionado]}
      >
        {cargando ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.botonTexto}>Desbloquear</Text>
        )}
      </Pressable>
      {error ? (
        <Text testID="bloqueo-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: "center", alignItems: "center", padding: 28, gap: 14 },
  titulo: { fontSize: 28, fontWeight: "700" },
  explicacion: { fontSize: 14 },
  boton: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40, alignItems: "center" },
  botonTexto: { color: "#ffffff", fontWeight: "700", fontSize: 16 },
  presionado: { opacity: 0.85 },
  error: { fontSize: 13 },
});
