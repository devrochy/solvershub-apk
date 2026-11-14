import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { Card, IconButton, Switch, useKit } from "@shared/ui";

import {
  avisosDeConfig,
  cargarConfigDeVentas,
  guardarAvisosDeSeguimiento,
  HORA_DEL_RESUMEN_MAX,
  textoDeHora,
  type AvisosDeSeguimiento as Avisos,
} from "../api";

/**
 * Avisos de seguimiento de Ventas (HU-CRM-22): apagar los recordatorios, apagar el resumen diario y
 * elegir la hora del resumen. Son ajustes del pack; quien no puede escribirlos los ve sin poder cambiarlos.
 * Cada cambio se guarda al instante y vuelve atrás si el servidor lo rechaza.
 */
export function AvisosDeSeguimiento({ puedeEscribir }: { puedeEscribir: boolean }) {
  const { c } = useKit();
  const api = useAdminApi();
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [avisos, setAvisos] = useState<Avisos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    cargarConfigDeVentas(api)
      .then((values) => {
        if (!vigente) return;
        setConfig(values);
        setAvisos(avisosDeConfig(values));
      })
      .catch(() => {
        if (vigente) setError("No pudimos leer los avisos de seguimiento.");
      });
    return () => {
      vigente = false;
    };
  }, [api]);

  const cambiar = useCallback(
    async (cambio: Partial<Avisos>) => {
      if (!config || !avisos || guardando) return;
      const previos = avisos;
      setAvisos({ ...avisos, ...cambio });
      setGuardando(true);
      setError(null);
      try {
        setConfig(await guardarAvisosDeSeguimiento(api, config, cambio));
      } catch (fallo) {
        setAvisos(previos);
        setError(fallo instanceof Error ? fallo.message : "No se pudo guardar el cambio.");
      } finally {
        setGuardando(false);
      }
    },
    [api, avisos, config, guardando],
  );

  if (!avisos) {
    return error ? (
      <Text accessibilityRole="alert" style={[shType.caption, { color: c.statusDangerFg }]}>
        {error}
      </Text>
    ) : null;
  }

  const editable = puedeEscribir && !guardando;
  return (
    <Card testID="avisos-seguimiento">
      <View style={styles.contenido}>
        <Text style={[shType.label, { color: c.text }]}>Avisos de seguimiento</Text>
        <Text style={[shType.caption, { color: c.textMuted }]}>
          Llegan a tu centro de notificaciones y no escriben al cliente.
        </Text>
        <Switch
          testID="avisos-recordatorios"
          label="Avisarme cuando llega la hora de un seguimiento"
          value={avisos.seguimiento_recordatorios}
          disabled={!editable}
          onValueChange={(valor) => void cambiar({ seguimiento_recordatorios: valor })}
        />
        <Switch
          testID="avisos-resumen"
          label="Resumen diario «Tu día de ventas»"
          description="Cuántos seguimientos tienes hoy, cuántos vencidos y cuántos leads nuevos."
          value={avisos.seguimiento_resumen_diario}
          disabled={!editable}
          onValueChange={(valor) => void cambiar({ seguimiento_resumen_diario: valor })}
        />
        {avisos.seguimiento_resumen_diario ? (
          <View style={styles.hora}>
            <Text style={[shType.body, { color: c.text }]}>Hora del resumen</Text>
            <View style={styles.paso}>
              <IconButton
                testID="avisos-hora-menos"
                icon="remove"
                label="Una hora antes"
                disabled={!editable || avisos.seguimiento_resumen_hora <= 0}
                onPress={() => void cambiar({ seguimiento_resumen_hora: avisos.seguimiento_resumen_hora - 1 })}
              />
              <Text testID="avisos-hora" style={[shType.label, { color: c.text }]}>
                {textoDeHora(avisos.seguimiento_resumen_hora)}
              </Text>
              <IconButton
                testID="avisos-hora-mas"
                icon="add"
                label="Una hora después"
                disabled={!editable || avisos.seguimiento_resumen_hora >= HORA_DEL_RESUMEN_MAX}
                onPress={() => void cambiar({ seguimiento_resumen_hora: avisos.seguimiento_resumen_hora + 1 })}
              />
            </View>
          </View>
        ) : null}
        {!puedeEscribir ? (
          <Text style={[shType.caption, { color: c.textMuted }]}>Solo el dueño puede cambiar estos avisos.</Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={[shType.caption, { color: c.statusDangerFg }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: shSpace[2], padding: shSpace[3] },
  hora: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  paso: { alignItems: "center", flexDirection: "row", gap: shSpace[2] },
});
