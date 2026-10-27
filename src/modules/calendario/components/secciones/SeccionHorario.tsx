import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { Button, useKit } from "@shared/ui";
import { useAdminApi } from "@core/session/use-admin-api";

import { cargarConfigPlugin, guardarConfigPlugin } from "../../api";
import {
  DIAS_SEMANA,
  horaValida,
  parsearHorario,
  partirRango,
  rangoValido,
  serializarHorario,
  type Horario,
} from "../../domain/horario";
import { HorarioCampos } from "../HorarioCampos";

/** Horario global de agendamiento (el de cada agenda se edita en Agendas). */
export function SeccionHorario({
  horario,
  config,
  puedeEscribir,
  onGuardado,
}: {
  horario: string | null;
  config: Record<string, unknown> | null;
  puedeEscribir: boolean;
  onGuardado: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [horas, setHoras] = useState<Horario>(() => parsearHorario(horario ?? ""));
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function guardar() {
    for (const dia of DIAS_SEMANA) {
      const valor = horas[dia.key] ?? "";
      if (!valor) continue;
      const { inicio, fin } = partirRango(valor);
      if (!horaValida(inicio) || !horaValida(fin) || !rangoValido(valor)) {
        setError(`${dia.label}: usa HH:MM y un fin posterior al inicio.`);
        return;
      }
    }
    setCargando(true);
    setError(null);
    try {
      const actual = config ?? (await cargarConfigPlugin(api, "pack_calendar")).values;
      await guardarConfigPlugin(api, "pack_calendar", {
        ...actual,
        business_hours: serializarHorario(horas),
      });
      setMensaje("Horario guardado.");
      onGuardado();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el horario.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <View style={styles.contenedor}>
      <Text style={[shType.dense, { color: c.textMuted }]}>
        Días y horas en que el asistente puede agendar citas. No cambia cuándo responde el chat: eso es el horario de
        atención de Configuración. Cada agenda puede tener el suyo.
      </Text>

      <HorarioCampos horas={horas} onChange={setHoras} disabled={!puedeEscribir} idBase="horario" />

      {error ? (
        <Text accessibilityRole="alert" style={{ color: c.statusDangerFg }}>
          {error}
        </Text>
      ) : null}
      {mensaje ? (
        <Text testID="horario-mensaje" style={{ color: c.statusSuccessFg }}>
          {mensaje}
        </Text>
      ) : null}

      {puedeEscribir ? (
        <Button loading={cargando} onPress={() => void guardar()} testID="horario-guardar">
          Guardar horario
        </Button>
      ) : (
        <Text style={[shType.caption, { color: c.textMuted }]}>No tienes permiso para cambiar el horario.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: shSpace[2] },
});
