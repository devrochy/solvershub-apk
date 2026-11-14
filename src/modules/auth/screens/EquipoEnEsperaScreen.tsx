import { useEffect, useRef, useState } from "react";
import { AppState, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@core/theme/theme-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import type { EstadoDelEquipo } from "@core/api/acceso";
import type { CodigoDeEquipo } from "@shared/acceso-evento";
import { Button, Icono, useKit } from "@shared/ui";

/** Cada cuánto se vuelve a preguntar si el dueño aprobó el equipo (solo en primer plano). */
export const INTERVALO_DE_SONDEO_MS = 10_000;

export type VistaDeEquipo = "pendiente" | "bloqueado" | "sin_id";

/** Qué explica la pantalla según el código que llegó del backend. */
export function vistaDeEquipo(codigo: CodigoDeEquipo): VistaDeEquipo {
  if (codigo === "dispositivo_bloqueado") return "bloqueado";
  if (codigo === "dispositivo_requerido") return "sin_id";
  return "pendiente";
}

const TEXTOS: Record<VistaDeEquipo, { titulo: string; cuerpo: string }> = {
  pendiente: {
    titulo: "Este equipo espera aprobación",
    cuerpo:
      "El dueño del negocio debe aprobar este teléfono antes de que puedas entrar. En cuanto lo haga, la app te deja pasar sola; no tienes que volver a escribir tu clave.",
  },
  bloqueado: {
    titulo: "Este equipo fue bloqueado",
    cuerpo:
      "El negocio bloqueó este teléfono, por eso no puedes entrar desde aquí. Si crees que es un error, habla con el dueño del negocio. Puedes cerrar sesión e ingresar con otra cuenta.",
  },
  sin_id: {
    titulo: "No pudimos identificar este equipo",
    cuerpo:
      "El negocio exige reconocer el teléfono y este no entrega su identificador. Habla con el dueño del negocio para que te indique cómo continuar.",
  },
};

const NOTA_DE_REINICIO =
  "Si restableciste el teléfono o reinstalaste la app, el equipo aparece como nuevo y hay que aprobarlo otra vez.";

export interface EquipoEnEsperaProps {
  codigo: CodigoDeEquipo;
  /** Consulta el estado del equipo en el negocio activo (`device-session`). */
  consultar(): Promise<EstadoDelEquipo>;
  /** El equipo ya está permitido: la app sigue sin pedir la clave. */
  alAprobado(): void;
  cerrarSesion(): void;
}

/**
 * Pantalla de equipo no autorizado (ADR-0174, HU-ACC-05). Pendiente: sondea cada 10 s en
 * primer plano y entra sola al aprobarse. Bloqueado o sin id: solo explica y deja cerrar sesión.
 */
export function EquipoEnEsperaScreen({ codigo, consultar, alAprobado, cerrarSesion }: EquipoEnEsperaProps) {
  const { colores } = useTheme();
  const { c } = useKit();
  // Mientras espera, el sondeo puede descubrir que lo bloquearon: eso manda sobre el código inicial.
  const [bloqueadoAlSondear, setBloqueadoAlSondear] = useState(false);
  const vista: VistaDeEquipo = bloqueadoAlSondear ? "bloqueado" : vistaDeEquipo(codigo);
  const [sinConexion, setSinConexion] = useState(false);
  const consultando = useRef(false);

  useEffect(() => {
    if (vista !== "pendiente") return;
    let activo = true;
    const sondear = async () => {
      // Solo en primer plano: en segundo plano el sistema pausaría el temporizador de todos modos.
      if (consultando.current || AppState.currentState === "background") return;
      consultando.current = true;
      try {
        const estado = await consultar();
        if (!activo) return;
        setSinConexion(false);
        if (estado.permitido) alAprobado();
        else if (estado.estado === "bloqueado") setBloqueadoAlSondear(true);
      } catch {
        if (activo) setSinConexion(true);
      } finally {
        consultando.current = false;
      }
    };
    const id = setInterval(() => void sondear(), INTERVALO_DE_SONDEO_MS);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, [vista, consultar, alAprobado]);

  const texto = TEXTOS[vista];
  return (
    <SafeAreaView
      testID="equipo-en-espera"
      edges={["top", "left", "right", "bottom"]}
      style={[styles.pantalla, { backgroundColor: colores.fondo }]}
    >
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.columna}>
          <Icono
            name={vista === "pendiente" ? "hourglass-empty" : "block"}
            size={44}
            color={vista === "pendiente" ? c.statusWarningFg : c.statusDangerFg}
          />
          <Text testID="equipo-titulo" accessibilityRole="header" style={[shType.h1, { color: c.text }]}>
            {texto.titulo}
          </Text>
          <Text testID="equipo-cuerpo" style={[shType.body, { color: c.textSoft }]}>
            {texto.cuerpo}
          </Text>
          {vista === "pendiente" ? (
            <>
              <Text testID="equipo-sondeo" accessibilityLiveRegion="polite" style={[shType.caption, { color: c.textSoft }]}>
                {sinConexion
                  ? "Sin conexión con el servidor; seguimos intentando."
                  : "Revisamos cada pocos segundos si ya fue aprobado."}
              </Text>
              <Text style={[shType.caption, styles.nota, { color: c.textSoft, borderColor: c.border }]}>
                {NOTA_DE_REINICIO}
              </Text>
            </>
          ) : null}
          <Button testID="equipo-salir" variant="secondary" fullWidth onPress={cerrarSesion}>
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { flexGrow: 1, justifyContent: "center", padding: shSpace[6] },
  columna: { width: "100%", maxWidth: 420, alignSelf: "center", gap: shSpace[4], alignItems: "stretch" },
  nota: { borderTopWidth: 1, paddingTop: shSpace[3], borderRadius: shRadius.sm },
});
