import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, EmptyState, ListItem, useKit } from "@shared/ui";
import { cargarAgentes, type VistaDeAgentes } from "../api";
import { etiquetaDeAgente, puedeCrearAgentes } from "../asistente";
import { AsistenteDeAgente } from "./AsistenteDeAgente";

/**
 * Agentes del negocio (HU-AOS-56): lista mínima —nombre, tipo y si está publicado— y el asistente
 * de creación para quien puede crear. Lo avanzado (frases, modelo, versiones) sigue en el panel web.
 */
export function AgentesScreen() {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const [vista, setVista] = useState<VistaDeAgentes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);

  // Cada cambio de `intento` vuelve a pedir la lista (reintentar, y al volver del asistente).
  const [intento, setIntento] = useState(0);
  const cargar = useCallback(() => {
    setError(null);
    setIntento((n) => n + 1);
  }, []);

  useEffect(() => {
    let vivo = true;
    cargarAgentes(api)
      .then((v) => vivo && setVista(v))
      .catch(
        () => vivo && setError("No pudimos cargar tus agentes. Revisa tu conexión e inténtalo de nuevo."),
      );
    return () => {
      vivo = false;
    };
  }, [api, intento]);

  if (creando) {
    return (
      <AsistenteDeAgente
        onTerminar={() => {
          setCreando(false);
          cargar();
        }}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.centro}>
        <Text style={[shType.body, { color: tonos.danger.fg }]} accessibilityRole="alert">
          {error}
        </Text>
        <Button variant="secondary" onPress={() => void cargar()}>
          Reintentar
        </Button>
      </View>
    );
  }
  if (!vista) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const puedeCrear = puedeCrearAgentes(sesion ?? {}, vista.runtime);
  return (
    <ScrollView contentContainerStyle={styles.contenido} testID="agentes-lista">
      {puedeCrear && (
        <Button variant="primary" onPress={() => setCreando(true)} fullWidth testID="agentes-nuevo">
          Nuevo agente
        </Button>
      )}
      {vista.items.length === 0 ? (
        puedeCrear ? (
          <EmptyState
            icon="smart-toy"
            title="Todavía no tienes agentes"
            description="Crea el primero con el asistente: te hace unas preguntas y lo deja listo."
            action={{ label: "Nuevo agente", onPress: () => setCreando(true) }}
          />
        ) : (
          <EmptyState
            icon="smart-toy"
            title="Todavía no tienes agentes"
            description="Pídele a quien administra tu negocio que cree el primero."
            secondaryAction={{ label: "Actualizar", onPress: () => void cargar() }}
          />
        )
      ) : (
        vista.items.map((a) => (
          <ListItem
            key={a.ref}
            title={a.name}
            subtitle={etiquetaDeAgente(a)}
            badge={
              a.published ? (
                <Badge tone="success" icon="check-circle" label="Publicado" />
              ) : (
                <Badge tone="warning" icon="edit" label="Borrador" />
              )
            }
          />
        ))
      )}
      {!puedeCrear && (
        <Text style={[shType.caption, { color: c.textMuted }]}>
          Para crear o editar agentes necesitas permiso de edición en Ajustes.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenido: { padding: shSpace["4"], gap: shSpace["3"] },
  centro: { flex: 1, padding: shSpace["6"], gap: shSpace["4"], justifyContent: "center" },
});
