import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, EmptyState, IconButton, useKit } from "@shared/ui";

import { eliminarTipo, type CollaboratorItem, type TypeOut } from "../../api";
import { useAdminApi } from "@core/session/use-admin-api";
import { codigoPorDefecto } from "../../domain/agenda";
import { FormularioTipo } from "./FormularioTipo";

function Muestra({ color }: { color: string }) {
  const { c } = useKit();
  const serie = /^cat-[1-4]$/.test(color) ? Number(color.slice(4)) : null;
  const fondo = serie ? [c.dataCat1, c.dataCat2, c.dataCat3, c.dataCat4][serie - 1] : c.borderStrong;
  return <View style={[styles.muestra, { backgroundColor: fondo }]} />;
}

/** Tipos de cita dentro del cajón de Ajustes de Agenda. */
export function SeccionTipos({
  tipos,
  colaboradores,
  puedeEscribir,
  onRefrescar,
}: {
  tipos: TypeOut[];
  colaboradores: CollaboratorItem[];
  puedeEscribir: boolean;
  onRefrescar: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [editando, setEditando] = useState<TypeOut | "nuevo" | null>(null);
  const emailDe = (id?: string | null) => colaboradores.find((colaborador) => colaborador.id === id)?.email;

  function borrar(tipo: TypeOut) {
    Alert.alert(
      `Eliminar «${tipo.name}»`,
      "Se quitará el tipo de cita. Las citas existentes conservan su historial.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void eliminarTipo(api, tipo.id)
              .then(onRefrescar)
              .catch((fallo: unknown) =>
                Alert.alert(
                  "No se pudo eliminar",
                  fallo instanceof Error ? fallo.message : "Intenta de nuevo.",
                ),
              );
          },
        },
      ],
    );
  }

  return (
    <View style={styles.contenedor}>
      <Text style={[shType.dense, { color: c.textMuted }]}>
        Servicios que el agente puede agendar. El color y el código distinguen sus citas en el calendario.
      </Text>

      {tipos.length === 0 ? (
        <EmptyState
          icon="event"
          title="Sin tipos de cita"
          description="Crea el primero (ej. Demo, Asesoría) para que el agente agende."
          {...(puedeEscribir
            ? { action: { label: "Nuevo tipo de cita", onPress: () => setEditando("nuevo") } }
            : { secondaryAction: { label: "Entendido", onPress: () => undefined } })}
        />
      ) : (
        <View style={[styles.lista, { borderColor: c.border }]}>
          {tipos.map((tipo) => (
            <View key={tipo.id} style={[styles.fila, { borderColor: c.borderSoft }]}>
              <View style={styles.principal}>
                <View style={styles.tituloFila}>
                  <Muestra color={tipo.color} />
                  <Text style={[shType.label, { color: c.text }]}>
                    {tipo.codigo || codigoPorDefecto(tipo.name)} · {tipo.name}
                  </Text>
                  {!tipo.active ? <Badge label="Inactivo" /> : null}
                </View>
                <Text style={[shType.caption, { color: c.textMuted }]}>
                  {tipo.duration_minutes} min · {emailDe(tipo.responsable_admin_id) ?? "Dueños"}
                </Text>
              </View>
              {puedeEscribir ? (
                <View style={styles.acciones}>
                  <IconButton
                    icon="edit"
                    label={`Editar ${tipo.name}`}
                    onPress={() => setEditando(tipo)}
                    testID={`tipo-editar-${tipo.id}`}
                  />
                  <IconButton
                    icon="delete-outline"
                    label={`Eliminar ${tipo.name}`}
                    tone="danger"
                    onPress={() => borrar(tipo)}
                    testID={`tipo-eliminar-${tipo.id}`}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {puedeEscribir ? (
        <Button variant="secondary" size="sm" onPress={() => setEditando("nuevo")} testID="tipo-nuevo">
          Nuevo tipo de cita
        </Button>
      ) : (
        <Text style={[shType.caption, { color: c.textMuted }]}>No tienes permiso para editar los tipos.</Text>
      )}

      {editando ? (
        <FormularioTipo
          key={editando === "nuevo" ? "nuevo" : editando.id}
          visible
          tipo={editando}
          colaboradores={colaboradores}
          onCerrar={() => setEditando(null)}
          onGuardado={onRefrescar}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[3] },
  lista: { borderWidth: 1, borderRadius: shRadius.sm, overflow: "hidden" },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    padding: shSpace[3],
    borderTopWidth: 1,
  },
  principal: { flex: 1, gap: 2 },
  tituloFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2], flexWrap: "wrap" },
  muestra: { width: 12, height: 12, borderRadius: 6 },
  acciones: { flexDirection: "row" },
});
