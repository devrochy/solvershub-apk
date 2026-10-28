import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, Field, RadioGroup, Sheet, TextField, useKit } from "@shared/ui";
import {
  enviarPlantillaConversacion,
  listarPlantillasDeConversacion,
  type ApprovedTemplate,
} from "../api";
import { faltantes, rellenarCuerpo } from "../plantillas";

/** Selector de plantilla aprobada para responder fuera de la ventana de 24 h. */
export function SelectorPlantilla({
  visible,
  onClose,
  conversationId,
  onEnviado,
}: {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  onEnviado: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [plantillas, setPlantillas] = useState<ApprovedTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegida, setElegida] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let vigente = true;
    /* eslint-disable react-hooks/set-state-in-effect -- al abrir la hoja se reinicia el selector */
    setCargando(true);
    setError(null);
    setPlantillas(null);
    setElegida("");
    setValores({});
    /* eslint-enable react-hooks/set-state-in-effect */
    void listarPlantillasDeConversacion(api, conversationId)
      .then((lista) => {
        if (vigente) setPlantillas(lista);
      })
      .catch(() => {
        if (vigente) setError("No se pudieron cargar las plantillas aprobadas.");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [visible, api, conversationId]);

  const plantilla = plantillas?.find((p) => p.id === elegida) ?? null;
  const pendientes = plantilla ? faltantes(plantilla.variables, valores) : [];

  async function enviar() {
    if (!plantilla || pendientes.length > 0 || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      await enviarPlantillaConversacion(api, conversationId, plantilla.id, valores);
      onEnviado();
      onClose();
    } catch {
      setError("No se pudo enviar la plantilla. Revisa la conexión e intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Responder con una plantilla"
      description="WhatsApp solo permite escribir fuera de las 24 h con una plantilla aprobada."
      testID="sheet-plantilla"
    >
      {cargando ? (
        <View style={styles.centro}>
          <ActivityIndicator color={c.link} />
          <Text style={[shType.caption, { color: c.textSoft }]}>Cargando plantillas…</Text>
        </View>
      ) : error ? (
        <Text accessibilityLiveRegion="polite" style={[shType.dense, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : plantillas && plantillas.length === 0 ? (
        <Text style={[shType.dense, { color: c.textSoft }]}>
          Esta conexión no tiene plantillas aprobadas. Créalas en Plantillas de WhatsApp y espera la
          aprobación de Meta.
        </Text>
      ) : plantillas && plantillas.length > 0 ? (
        <>
          <RadioGroup
            label="Plantilla"
            value={elegida}
            options={plantillas.map((p) => ({ value: p.id, label: `${p.name} (${p.language})` }))}
            onValueChange={(id) => {
              setElegida(id);
              setValores({});
            }}
            testID="plantilla"
          />

          {plantilla ? (
            <>
              {plantilla.variables.map((variable) => (
                <Field key={variable} label={`Variable {{${variable}}}`}>
                  <TextField
                    testID={`detalle-plantilla-${variable}`}
                    value={valores[variable] ?? ""}
                    onChangeText={(texto) =>
                      setValores((actuales) => ({ ...actuales, [variable]: texto }))
                    }
                    maxLength={1000}
                  />
                </Field>
              ))}

              <Text
                style={[
                  shType.dense,
                  styles.vista,
                  { color: c.text, backgroundColor: c.surface2, borderColor: c.borderSoft },
                ]}
              >
                {rellenarCuerpo(plantilla.body, valores)}
              </Text>

              <Button
                variant="primary"
                onPress={() => void enviar()}
                disabled={pendientes.length > 0 || enviando}
                loading={enviando}
                testID="detalle-plantilla-enviar"
                style={styles.enviar}
              >
                Enviar plantilla
              </Button>
            </>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: "center", gap: shSpace[2], paddingVertical: shSpace[4] },
  vista: { borderWidth: 1, borderRadius: shRadius.sm, padding: shSpace[3] },
  enviar: { alignSelf: "flex-end" },
});
