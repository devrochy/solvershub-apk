import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, IconButton, Icono, RadioGroup, Sheet, TextField, useKit } from "@shared/ui";
import type { ConversationConnection } from "../api";

export interface FiltrosDeConversaciones {
  q: string;
  status?: string;
  connectionId?: string;
}

const ESTADOS: { clave: string | undefined; label: string }[] = [
  { clave: undefined, label: "Todas" },
  { clave: "open", label: "Abiertas" },
  { clave: "escalated", label: "Escaladas" },
  { clave: "closed", label: "Cerradas" },
];

/** Búsqueda, estado y conexión de la bandeja (los mismos filtros del panel). */
export function FiltrosConversaciones({
  filtros,
  conexiones,
  onChange,
}: {
  filtros: FiltrosDeConversaciones;
  conexiones: ConversationConnection[];
  onChange: (cambios: Partial<FiltrosDeConversaciones>) => void;
}) {
  const { c } = useKit();
  const [eligiendoConexion, setEligiendoConexion] = useState(false);
  const conexion = conexiones.find((x) => x.id === filtros.connectionId);
  const hayFiltros = Boolean(filtros.q || filtros.status || filtros.connectionId);

  return (
    <View style={styles.contenedor}>
      <View style={styles.buscador}>
        <View style={styles.lupa} pointerEvents="none">
          <Icono name="search" size={20} color={c.textSoft} />
        </View>
        <TextField
          testID="operacion-busqueda"
          value={filtros.q}
          onChangeText={(texto) => onChange({ q: texto })}
          placeholder="Buscar por nombre o teléfono"
          accessibilityLabel="Buscar conversaciones"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.campoBusqueda}
        />
        {filtros.q ? (
          <View style={styles.limpiarBusqueda}>
            <IconButton
              icon="close"
              label="Limpiar búsqueda"
              size="sm"
              onPress={() => onChange({ q: "" })}
              testID="operacion-busqueda-limpiar"
            />
          </View>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityLabel="Filtrar por estado"
      >
        {ESTADOS.map((estado) => {
          const activo = filtros.status === estado.clave;
          return (
            <Pressable
              key={estado.label}
              testID={`filtro-estado-${estado.clave ?? "todas"}`}
              accessibilityRole="button"
              accessibilityLabel={estado.label}
              accessibilityState={{ selected: activo }}
              onPress={() => onChange({ status: estado.clave })}
              style={[
                styles.chip,
                {
                  borderColor: activo ? c.link : c.border,
                  backgroundColor: activo ? c.surfaceRaised : c.surface,
                },
              ]}
            >
              <Text style={[shType.caption, { color: activo ? c.link : c.textMuted }]}>
                {estado.label}
              </Text>
            </Pressable>
          );
        })}

        {conexiones.length > 1 ? (
          <Pressable
            testID="filtro-conexion"
            accessibilityRole="button"
            accessibilityLabel={conexion ? `Conexión: ${conexion.label}` : "Filtrar por conexión"}
            onPress={() => setEligiendoConexion(true)}
            style={[
              styles.chip,
              styles.chipConexion,
              {
                borderColor: conexion ? c.link : c.border,
                backgroundColor: conexion ? c.surfaceRaised : c.surface,
              },
            ]}
          >
            <Icono name="tune" size={14} color={conexion ? c.link : c.textMuted} />
            <Text style={[shType.caption, { color: conexion ? c.link : c.textMuted }]} numberOfLines={1}>
              {conexion ? conexion.label : "Conexión"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {hayFiltros ? (
        <View style={styles.filaLimpiar}>
          <Button
            variant="link"
            size="sm"
            iconLeft="filter-alt-off"
            onPress={() => onChange({ q: "", status: undefined, connectionId: undefined })}
            testID="operacion-filtros-limpiar"
          >
            Limpiar filtros
          </Button>
        </View>
      ) : null}

      <Sheet
        visible={eligiendoConexion}
        onClose={() => setEligiendoConexion(false)}
        title="Filtrar por conexión"
        description="Muestra solo los chats que llegan por una conexión."
        testID="sheet-conexiones"
      >
        <RadioGroup
          label="Conexión"
          value={filtros.connectionId ?? ""}
          options={[
            { value: "", label: "Todas las conexiones" },
            ...conexiones.map((x) => ({ value: x.id, label: x.label })),
          ]}
          onValueChange={(valor) => {
            onChange({ connectionId: valor || undefined });
            setEligiendoConexion(false);
          }}
          testID="conexion"
        />
        <Button variant="secondary" fullWidth onPress={() => setEligiendoConexion(false)}>
          Cerrar
        </Button>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2], marginBottom: shSpace[2] },
  buscador: { justifyContent: "center" },
  lupa: { position: "absolute", left: shSpace[3], zIndex: 1 },
  limpiarBusqueda: { position: "absolute", right: shSpace[1], zIndex: 1 },
  campoBusqueda: { paddingLeft: 40, paddingRight: 44 },
  chips: { flexDirection: "row", gap: shSpace[2], paddingVertical: shSpace[1] },
  chip: {
    minHeight: 36,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  chipConexion: { flexDirection: "row", alignItems: "center", gap: shSpace[1], maxWidth: 220 },
  filaLimpiar: { flexDirection: "row", alignItems: "center" },
});
