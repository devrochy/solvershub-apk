import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Field, TextField, useKit } from "@shared/ui";
import { useAdminApi } from "@core/session/use-admin-api";

import { actualizarAgenda, crearAgenda, type CalendarOut, type CollaboratorItem } from "../../api";
import { aliasesDeTexto, type ColorTipo } from "../../domain/agenda";
import { parsearHorario, serializarHorario, type Horario } from "../../domain/horario";
import { HorarioCampos } from "../HorarioCampos";
import { SelectorColor } from "../SelectorColor";

/** Alta o edición de una agenda (interna o la de una cuenta de Google). */
export function FormularioAgenda({
  agenda,
  colaboradores,
  zonaNegocio,
  puedeEscribir,
  onGuardado,
  onCancelar,
}: {
  agenda?: CalendarOut;
  colaboradores: CollaboratorItem[];
  zonaNegocio: string;
  puedeEscribir: boolean;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [nombre, setNombre] = useState(agenda?.name ?? "");
  const [descripcion, setDescripcion] = useState(agenda?.description ?? "");
  const [alias, setAlias] = useState((agenda?.aliases ?? []).join(", "));
  const [color, setColor] = useState<string | null>(agenda?.color ?? null);
  const [zona, setZona] = useState(agenda?.own_timezone ?? "");
  const [propio, setPropio] = useState(Boolean(agenda?.business_hours));
  const [horas, setHoras] = useState<Horario>(() => parsearHorario(agenda?.business_hours ?? ""));
  const [responsable, setResponsable] = useState(agenda?.responsable_admin_id ?? "");
  const [activa, setActiva] = useState(agenda?.active ?? true);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activos = colaboradores.filter((colaborador) => colaborador.active);
  const nombreLimpio = nombre.trim();

  async function guardar() {
    if (!nombreLimpio) {
      setError("El nombre de la agenda es obligatorio.");
      return;
    }
    if (nombreLimpio.length > 60) {
      setError("El nombre no puede pasar de 60 caracteres.");
      return;
    }
    setCargando(true);
    setError(null);
    const comunes = {
      name: nombreLimpio,
      description: descripcion.trim(),
      aliases: aliasesDeTexto(alias),
      ...(color ? { color: color as ColorTipo } : {}),
      ...(zona.trim() ? { timezone: zona.trim() } : {}),
      ...(propio ? { business_hours: serializarHorario(horas) } : {}),
      responsable_admin_id: responsable || null,
    };
    try {
      if (agenda) {
        await actualizarAgenda(api, agenda.id, {
          name: comunes.name,
          description: comunes.description,
          aliases: comunes.aliases,
          ...(color ? { color: color as ColorTipo } : {}),
          ...(zona.trim() ? { timezone: zona.trim() } : {}),
          ...(propio ? { business_hours: serializarHorario(horas) } : {}),
          ...(responsable ? { responsable_admin_id: responsable } : {}),
          ...(!agenda.is_default ? { active: activa } : {}),
          inherit_timezone: !zona.trim(),
          inherit_business_hours: !propio,
          clear_responsable: !responsable,
        });
      } else {
        await crearAgenda(api, {
          name: comunes.name,
          description: comunes.description,
          aliases: comunes.aliases,
          ...(color ? { color: color as ColorTipo } : {}),
          ...(zona.trim() ? { timezone: zona.trim() } : {}),
          ...(propio ? { business_hours: serializarHorario(horas) } : {}),
          responsable_admin_id: responsable || null,
        });
      }
      onGuardado();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar la agenda.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}

      <Field label="Nombre" required hint="Es el que el asistente le dice al cliente (ej. «Dra. Ana», «Sede Norte»).">
        <TextField
          value={nombre}
          onChangeText={setNombre}
          maxLength={60}
          disabled={!puedeEscribir}
          testID="form-agenda-nombre"
        />
      </Field>
      <Field label="Descripción" hint="Para quién es o qué atiende; ayuda al asistente a recomendar.">
        <TextField
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={2}
          disabled={!puedeEscribir}
          testID="form-agenda-descripcion"
        />
      </Field>
      <Field label="Alias" hint="Otras formas de nombrarla, separadas por coma.">
        <TextField
          value={alias}
          onChangeText={setAlias}
          disabled={!puedeEscribir}
          testID="form-agenda-alias"
        />
      </Field>

      <Field label="Color">
        <SelectorColor valor={color} onChange={setColor} testID="form-agenda-color" />
      </Field>

      <Field
        label="Zona horaria"
        hint={`Vacío = la del negocio (${zonaNegocio}). Ej. America/Bogota.`}
      >
        <TextField
          value={zona}
          onChangeText={setZona}
          placeholder="La del negocio"
          autoCapitalize="none"
          disabled={!puedeEscribir}
          testID="form-agenda-zona"
        />
      </Field>

      <Field label="Responsable" hint="Recibe los avisos de las citas de esta agenda.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
          <Opcion activo={!responsable} etiqueta="Dueños" onPress={() => setResponsable("")} disabled={!puedeEscribir} />
          {activos.map((colaborador) => (
            <Opcion
              key={colaborador.id}
              activo={responsable === colaborador.id}
              etiqueta={colaborador.email}
              onPress={() => setResponsable(colaborador.id)}
              disabled={!puedeEscribir}
            />
          ))}
        </ScrollView>
      </Field>

      <View style={[styles.switchFila, { borderColor: c.border }]}>
        <View style={styles.switchTexto}>
          <Text style={[shType.label, { color: c.text }]}>Horario propio</Text>
          <Text style={[shType.caption, { color: c.textMuted }]}>Si no, usa el horario del negocio.</Text>
        </View>
        <Switch
          testID="form-agenda-propio"
          value={propio}
          disabled={!puedeEscribir}
          onValueChange={setPropio}
          trackColor={{ true: c.link, false: c.controlBorder }}
          thumbColor={c.surface}
        />
      </View>
      {propio ? (
        <HorarioCampos horas={horas} onChange={setHoras} disabled={!puedeEscribir} idBase="form-agenda-horario" />
      ) : null}

      {agenda && !agenda.is_default ? (
        <View style={[styles.switchFila, { borderColor: c.border }]}>
          <View style={styles.switchTexto}>
            <Text style={[shType.label, { color: c.text }]}>Activa</Text>
            <Text style={[shType.caption, { color: c.textMuted }]}>El asistente la ofrece a los clientes.</Text>
          </View>
          <Switch
            testID="form-agenda-activa"
            value={activa}
            disabled={!puedeEscribir}
            onValueChange={setActiva}
            trackColor={{ true: c.link, false: c.controlBorder }}
            thumbColor={c.surface}
          />
        </View>
      ) : null}

      {puedeEscribir ? (
        <View style={styles.botones}>
          <Button variant="ghost" onPress={onCancelar}>
            Cancelar
          </Button>
          <Button loading={cargando} onPress={() => void guardar()} testID="form-agenda-guardar">
            {agenda ? "Guardar agenda" : "Crear agenda"}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

function Opcion({
  activo,
  etiqueta,
  onPress,
  disabled,
}: {
  activo: boolean;
  etiqueta: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { c } = useKit();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activo, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.opcion,
        {
          borderColor: activo ? c.link : c.border,
          backgroundColor: activo ? c.surfaceRaised : c.surface,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[shType.label, { color: c.text }]} numberOfLines={1}>
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[3] },
  opciones: { gap: shSpace[2], paddingRight: shSpace[2] },
  opcion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: shSpace[3], paddingVertical: shSpace[2], maxWidth: 240 },
  switchFila: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: shSpace[3], gap: shSpace[3] },
  switchTexto: { flex: 1, gap: 2 },
  botones: { flexDirection: "row", justifyContent: "flex-end", gap: shSpace[2] },
});
