import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Icono, Sheet, TextField, useKit } from "@shared/ui";
import { CANAL_LABEL } from "@shared/domain/formato-clientes";
import type { ConversationConnection, FiltroLeads, LeadFilter } from "../api";

const CANALES = ["whatsapp", "instagram", "messenger", "webchat", "email"];

export interface FiltrosDeClientesProps {
  valor: FiltroLeads;
  conexiones: ConversationConnection[];
  filtrosDePack: LeadFilter[];
  onChange: (filtro: FiltroLeads) => void;
}

/** Filtros de Clientes: búsqueda visible y el resto en una hoja, como el panel. */
export function FiltrosDeClientes({
  valor,
  conexiones,
  filtrosDePack,
  onChange,
}: FiltrosDeClientesProps) {
  const { c } = useKit();
  const [abierto, setAbierto] = useState(false);
  const activos = filtrosActivos(valor, conexiones, filtrosDePack);
  const cantidad = activos.length;

  return (
    <View style={styles.contenedor}>
      <View style={[styles.buscador, { borderColor: c.controlBorder, backgroundColor: c.surface }]}>
        <Icono name="search" size={20} color={c.textMuted} />
        <TextField
          testID="clientes-busqueda"
          accessibilityLabel="Buscar clientes"
          placeholder="Nombre, identificador o teléfono"
          value={valor.q ?? ""}
          onChangeText={(q) => onChange({ ...valor, q })}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.campoBusqueda}
        />
      </View>

      <View style={styles.fila}>
        <Button
          testID="clientes-filtros"
          variant="secondary"
          size="sm"
          iconLeft="filter-list"
          onPress={() => setAbierto(true)}
        >
          {cantidad > 0 ? `Filtros (${cantidad})` : "Filtros"}
        </Button>
        {cantidad > 0 ? (
          <Button testID="clientes-limpiar" variant="link" size="sm" onPress={() => onChange({ q: valor.q })}>
            Limpiar
          </Button>
        ) : null}
      </View>

      {activos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {activos.map((filtro) => (
            <Pressable
              key={filtro.clave}
              testID={`filtro-activo-${filtro.clave}`}
              accessibilityRole="button"
              accessibilityLabel={`Quitar filtro ${filtro.etiqueta}`}
              onPress={() => onChange(quitarFiltro(valor, filtro.clave))}
              style={[styles.chipActivo, { backgroundColor: c.surfaceRaised, borderColor: c.border }]}
            >
              <Text style={[shType.caption, { color: c.text }]}>{filtro.etiqueta}</Text>
              <Icono name="close" size={14} color={c.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Sheet
        visible={abierto}
        onClose={() => setAbierto(false)}
        title="Filtrar clientes"
        description="Solo se muestran los clientes que cumplen todos los filtros."
        testID="clientes-filtros-hoja"
        footer={
          <>
            <Button
              testID="filtros-limpiar"
              variant="secondary"
              onPress={() => {
                onChange({ q: valor.q });
                setAbierto(false);
              }}
              style={styles.flex}
            >
              Limpiar
            </Button>
            <Button testID="filtros-aplicar" onPress={() => setAbierto(false)} style={styles.flex}>
              Aplicar
            </Button>
          </>
        }
      >
        <FiltrosHoja
          valor={valor}
          conexiones={conexiones}
          filtrosDePack={filtrosDePack}
          onChange={onChange}
        />
      </Sheet>
    </View>
  );
}

function FiltrosHoja({
  valor,
  conexiones,
  filtrosDePack,
  onChange,
}: FiltrosDeClientesProps) {
  const { c } = useKit();

  return (
    <View style={styles.hoja}>
      <Seccion titulo="Canal">
        <View style={styles.chipsWrap}>
          <Chip
            label="Todos"
            selected={!valor.channel}
            onPress={() => onChange({ ...valor, channel: undefined })}
            testID="filtro-canal-todos"
          />
          {CANALES.map((canal) => (
            <Chip
              key={canal}
              label={CANAL_LABEL[canal] ?? canal}
              selected={valor.channel === canal}
              onPress={() => onChange({ ...valor, channel: canal })}
              testID={`filtro-canal-${canal}`}
            />
          ))}
        </View>
      </Seccion>

      {conexiones.length > 1 ? (
        <Seccion titulo="Conexión">
          <View style={styles.chipsWrap}>
            <Chip
              label="Todas"
              selected={!valor.connection_id}
              onPress={() => onChange({ ...valor, connection_id: undefined })}
              testID="filtro-conexion-todas"
            />
            {conexiones.map((conexion) => (
              <Chip
                key={conexion.id}
                label={conexion.label}
                selected={valor.connection_id === conexion.id}
                onPress={() => onChange({ ...valor, connection_id: conexion.id })}
                testID={`filtro-conexion-${conexion.id}`}
              />
            ))}
          </View>
        </Seccion>
      ) : null}

      {filtrosDePack.map((filtro) => (
        <Seccion key={filtro.key} titulo={filtro.label}>
          <View style={styles.chipsWrap}>
            <Chip
              label="Todos"
              selected={!valorDePack(valor, filtro.key)}
              onPress={() => onChange({ ...valor, filtros: sinFiltroDePack(valor, filtro.key) })}
              testID={`filtro-${filtro.key}-todos`}
            />
            {filtro.options.map((opcion) => (
              <Chip
                key={opcion.value}
                label={opcion.label}
                selected={valorDePack(valor, filtro.key) === opcion.value}
                onPress={() =>
                  onChange({
                    ...valor,
                    filtros: [
                      ...sinFiltroDePack(valor, filtro.key),
                      `${filtro.key}:${opcion.value}`,
                    ],
                  })
                }
                testID={`filtro-${filtro.key}-${opcion.value}`}
              />
            ))}
          </View>
        </Seccion>
      ))}

      {filtrosDePack.length === 0 && conexiones.length <= 1 ? (
        <Text style={[shType.dense, { color: c.textMuted }]}>
          Este negocio todavía no tiene filtros adicionales.
        </Text>
      ) : null}
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { c } = useKit();
  return (
    <View style={styles.seccion}>
      <Text style={[shType.label, { color: c.text }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID: string;
}) {
  const { c, relleno } = useKit();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.chip,
        {
          borderColor: selected ? relleno.primario : c.controlBorder,
          backgroundColor: selected ? relleno.primario : c.surface,
        },
      ]}
    >
      <Text style={[shType.label, { color: selected ? relleno.sobrePrimario : c.text }]}>{label}</Text>
    </Pressable>
  );
}

function filtrosActivos(
  valor: FiltroLeads,
  conexiones: ConversationConnection[],
  filtrosDePack: LeadFilter[],
): { clave: string; etiqueta: string }[] {
  const activos: { clave: string; etiqueta: string }[] = [];
  if (valor.channel) activos.push({ clave: "channel", etiqueta: CANAL_LABEL[valor.channel] ?? valor.channel });
  if (valor.connection_id) {
    const conexion = conexiones.find((item) => item.id === valor.connection_id);
    activos.push({ clave: "connection_id", etiqueta: conexion?.label ?? "Conexión" });
  }
  for (const filtro of valor.filtros ?? []) {
    const [clave, valorFiltro] = filtro.split(":", 2);
    if (!clave || !valorFiltro) continue;
    const definicion = filtrosDePack.find((item) => item.key === clave);
    const opcion = definicion?.options.find((item) => item.value === valorFiltro);
    activos.push({
      clave: filtro,
      etiqueta: definicion ? `${definicion.label}: ${opcion?.label ?? valorFiltro}` : `${clave}: ${valorFiltro}`,
    });
  }
  return activos;
}

function valorDePack(valor: FiltroLeads, clave: string): string | undefined {
  const encontrado = (valor.filtros ?? []).find((f) => f.startsWith(`${clave}:`));
  return encontrado ? encontrado.slice(clave.length + 1) : undefined;
}

function quitarFiltro(valor: FiltroLeads, clave: string): FiltroLeads {
  if (clave === "channel") return { ...valor, channel: undefined };
  if (clave === "connection_id") return { ...valor, connection_id: undefined };
  return { ...valor, filtros: (valor.filtros ?? []).filter((f) => f !== clave) };
}

function sinFiltroDePack(valor: FiltroLeads, clave: string): string[] {
  return (valor.filtros ?? []).filter((f) => !f.startsWith(`${clave}:`));
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
  buscador: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingLeft: shSpace[3],
  },
  campoBusqueda: { flex: 1, borderWidth: 0, backgroundColor: "transparent" },
  fila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  chips: { flexDirection: "row", gap: shSpace[2], paddingVertical: shSpace[1] },
  chipActivo: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
    minHeight: shDensity.controlMd,
  },
  hoja: { gap: shSpace[4] },
  seccion: { gap: shSpace[2] },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  chip: {
    justifyContent: "center",
    minHeight: shDensity.controlLg,
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[3],
  },
  flex: { flex: 1 },
});
