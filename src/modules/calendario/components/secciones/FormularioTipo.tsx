import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, Field, Sheet, TextField, useKit } from "@shared/ui";

import { actualizarTipo, crearTipo, type CollaboratorItem, type TypeOut } from "../../api";
import { CODIGO_MAX, normalizarCodigo, type ColorTipo } from "../../domain/agenda";
import { SelectorColor } from "../SelectorColor";
import { useAdminApi } from "@core/session/use-admin-api";

/** Alta o edición de un tipo de cita (HU-UX-08: color y código). */
export function FormularioTipo({
  visible,
  tipo,
  colaboradores,
  onCerrar,
  onGuardado,
}: {
  visible: boolean;
  tipo: TypeOut | "nuevo" | null;
  colaboradores: CollaboratorItem[];
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const esNuevo = tipo === "nuevo";
  const datos = tipo && tipo !== "nuevo" ? tipo : null;
  const [nombre, setNombre] = useState(datos?.name ?? "");
  const [duracion, setDuracion] = useState(String(datos?.duration_minutes ?? 60));
  const [descripcion, setDescripcion] = useState(datos?.description ?? "");
  const [color, setColor] = useState<string | null>(datos?.color ?? null);
  const [codigo, setCodigo] = useState(datos?.codigo ?? "");
  const [responsable, setResponsable] = useState(datos?.responsable_admin_id ?? "");
  const [enlace, setEnlace] = useState(datos?.enlace_reunion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const activos = colaboradores.filter((colaborador) => colaborador.active);

  async function guardar() {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (enlace.trim() && !/^https?:\/\//i.test(enlace.trim())) {
      setError("El enlace de la reunión tiene que empezar con https://.");
      return;
    }
    setCargando(true);
    setError(null);
    const cuerpo = {
      name: nombre.trim(),
      duration_minutes: Number(duracion) || 60,
      description: descripcion.trim(),
      responsable_admin_id: responsable || null,
      enlace_reunion: enlace.trim(),
      ...(color ? { color: color as ColorTipo } : {}),
      codigo: normalizarCodigo(codigo),
    };
    try {
      if (esNuevo) await crearTipo(api, cuerpo);
      else if (datos) await actualizarTipo(api, datos.id, cuerpo);
      onGuardado();
      onCerrar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el tipo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onCerrar}
      title={esNuevo ? "Nuevo tipo de cita" : `Editar ${datos?.name ?? "tipo"}`}
      description="El color y el código distinguen sus citas en el calendario."
      testID="hoja-tipo"
      footer={
        <View style={styles.pie}>
          <Button variant="ghost" onPress={onCerrar}>
            Cancelar
          </Button>
          <Button loading={cargando} onPress={() => void guardar()} testID="hoja-tipo-guardar">
            {esNuevo ? "Crear tipo" : "Guardar"}
          </Button>
        </View>
      }
    >
      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}

      <Field label="Nombre" required>
        <TextField value={nombre} onChangeText={setNombre} maxLength={80} testID="hoja-tipo-nombre" />
      </Field>
      <Field label="Duración (min)">
        <TextField
          value={duracion}
          onChangeText={setDuracion}
          keyboardType="number-pad"
          testID="hoja-tipo-duracion"
        />
      </Field>
      <Field label="Descripción">
        <TextField value={descripcion} onChangeText={setDescripcion} testID="hoja-tipo-descripcion" />
      </Field>

      <Field label="Color">
        <SelectorColor valor={color} onChange={setColor} testID="hoja-tipo-color" />
      </Field>
      <Field label="Código" hint={`Corto, se ve en cada cita (máx. ${CODIGO_MAX}).`}>
        <TextField
          value={codigo}
          onChangeText={(valor) => setCodigo(normalizarCodigo(valor))}
          autoCapitalize="characters"
          maxLength={CODIGO_MAX}
          testID="hoja-tipo-codigo"
        />
      </Field>

      <Field label="Responsable" hint="Recibe el aviso de cada cita de este tipo.">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
          <Opcion
            activo={!responsable}
            etiqueta="Dueños"
            onPress={() => setResponsable("")}
          />
          {activos.map((colaborador) => (
            <Opcion
              key={colaborador.id}
              activo={responsable === colaborador.id}
              etiqueta={colaborador.email}
              onPress={() => setResponsable(colaborador.id)}
            />
          ))}
        </ScrollView>
      </Field>

      <Field label="Enlace de la reunión" hint="Meet, Zoom… (vacío = el general).">
        <TextField
          value={enlace}
          onChangeText={setEnlace}
          autoCapitalize="none"
          keyboardType="url"
          testID="hoja-tipo-enlace"
        />
      </Field>
    </Sheet>
  );
}

function Opcion({ activo, etiqueta, onPress }: { activo: boolean; etiqueta: string; onPress: () => void }) {
  const { c } = useKit();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: activo }}
      onPress={onPress}
      style={[
        styles.opcion,
        {
          borderColor: activo ? c.link : c.border,
          backgroundColor: activo ? c.surfaceRaised : c.surface,
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
  pie: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flex: 1 },
  opciones: { gap: shSpace[2], paddingRight: shSpace[2] },
  opcion: { borderWidth: 1, borderRadius: 999, paddingHorizontal: shSpace[3], paddingVertical: shSpace[2], maxWidth: 240 },
});
