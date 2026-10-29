import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, IconButton, Icono, RadioGroup, Sheet, TextField, useKit } from "@shared/ui";
import type { ConversationConnection } from "../api";
import { canalLabel, colorDelCanal, iconoDelCanal } from "../presentacion";

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

function tipoDeConexion(conexion: ConversationConnection): string {
  return conexion.type_id ?? conexion.channel;
}

/** Búsqueda, estado (control segmentado) y conexión con su icono y color. */
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
  const tipo = conexion ? tipoDeConexion(conexion) : null;
  const hayFiltros = Boolean(filtros.q || filtros.status || filtros.connectionId);

  return (
    <View style={styles.contenedor}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel="Filtrar por estado"
        style={[styles.tabs, { backgroundColor: c.surface, borderColor: c.borderSoft }]}
      >
        {ESTADOS.map((estado) => {
          const activo = filtros.status === estado.clave;
          return (
            <Pressable
              key={estado.label}
              testID={`filtro-estado-${estado.clave ?? "todas"}`}
              accessibilityRole="tab"
              accessibilityLabel={estado.label}
              accessibilityState={{ selected: activo }}
              onPress={() => onChange({ status: estado.clave })}
              style={[
                styles.tab,
                activo && {
                  backgroundColor: c.surfaceRaised,
                  borderColor: c.borderSoft,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.6}
                style={[shType.label, { color: activo ? c.text : c.textMuted }]}
              >
                {estado.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

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

      {conexiones.length > 1 ? (
        <Pressable
          testID="filtro-conexion"
          accessibilityRole="button"
          accessibilityLabel={
            conexion ? `Conexión: ${conexion.label || canalLabel(tipo)}` : "Filtrar por conexión"
          }
          onPress={() => setEligiendoConexion(true)}
          style={[
            styles.conexion,
            {
              borderColor: conexion ? c.link : c.borderSoft,
              backgroundColor: c.surface,
            },
          ]}
        >
          <Icono
            name={conexion && tipo ? iconoDelCanal(tipo) : "layers"}
            size={20}
            color={conexion && tipo ? colorDelCanal(tipo, c) : c.textMuted}
          />
          <Text
            style={[shType.label, styles.conexionTexto, { color: conexion ? c.text : c.textMuted }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.6}
          >
            {conexion ? conexion.label || canalLabel(tipo) : "Todas las conexiones"}
          </Text>
          <Icono name="expand-more" size={20} color={c.textSoft} />
        </Pressable>
      ) : null}

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
            { value: "", label: "Todas las conexiones", icono: "layers", iconColor: c.textSoft },
            ...conexiones.map((x) => {
              const tipoConexion = tipoDeConexion(x);
              return {
                value: x.id,
                label: x.label || canalLabel(tipoConexion),
                description: canalLabel(tipoConexion),
                icono: iconoDelCanal(tipoConexion),
                iconColor: colorDelCanal(tipoConexion, c),
              };
            }),
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
  tabs: {
    flexDirection: "row",
    gap: 3,
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    minHeight: shDensity.controlLg - 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: shRadius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: shSpace[1],
  },
  buscador: { justifyContent: "center" },
  lupa: { position: "absolute", left: shSpace[3], zIndex: 1 },
  limpiarBusqueda: { position: "absolute", right: shSpace[1], zIndex: 1 },
  campoBusqueda: { paddingLeft: 40, paddingRight: 44 },
  conexion: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.md,
    paddingHorizontal: shSpace[3],
  },
  conexionTexto: { flex: 1 },
  filaLimpiar: { flexDirection: "row", alignItems: "center" },
});
