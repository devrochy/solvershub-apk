import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, Sheet, TextField, useKit } from "@shared/ui";
import type { ConversationNote } from "../api";
import { formatearFechaHora } from "../presentacion";

/** Notas internas del equipo: nunca se envían al cliente. */
export function NotasInternas({
  visible,
  onClose,
  notas,
  onGuardar,
}: {
  visible: boolean;
  onClose: () => void;
  notas: ConversationNote[];
  onGuardar: (texto: string) => Promise<void>;
}) {
  const { c } = useKit();
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    const limpio = texto.trim();
    if (!limpio || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(limpio);
      setTexto("");
    } catch {
      setError("No se pudo guardar la nota. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Notas internas"
      description={`Solo las ve el equipo${notas.length ? ` · ${notas.length}` : ""}.`}
      testID="sheet-notas"
    >
      {notas.length === 0 ? (
        <Text style={[shType.dense, { color: c.textSoft }]}>
          Sin notas. Escribe la primera para que el equipo tenga contexto.
        </Text>
      ) : (
        <View style={styles.lista}>
          {notas.map((nota, i) => (
            <View
              key={`${nota.created_at ?? "sin-fecha"}-${i}`}
              testID={`nota-conversacion-${i}`}
              style={[styles.nota, { borderColor: c.borderSoft, backgroundColor: c.surface2 }]}
            >
              <Text style={[shType.dense, { color: c.text }]}>{nota.text}</Text>
              <Text style={[shType.caption, { color: c.textSoft }]}>
                {nota.source === "human" ? (nota.author_email ?? "Equipo") : "Agente"}
                {nota.created_at ? ` · ${formatearFechaHora(nota.created_at)}` : ""}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TextField
        testID="detalle-nota-nueva"
        value={texto}
        onChangeText={setTexto}
        placeholder="Nota para el equipo (el cliente no la ve)…"
        accessibilityLabel="Nota interna"
        multiline
        maxLength={2000}
        style={styles.campo}
      />

      {error ? (
        <Text accessibilityLiveRegion="polite" style={[shType.caption, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        onPress={() => void guardar()}
        disabled={!texto.trim() || guardando}
        loading={guardando}
        testID="detalle-nota-guardar"
        style={styles.guardar}
      >
        Guardar nota
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  lista: { gap: shSpace[2] },
  nota: { gap: 4, borderWidth: 1, borderRadius: shRadius.sm, padding: shSpace[3] },
  campo: { minHeight: 80, textAlignVertical: "top" },
  guardar: { alignSelf: "flex-end" },
});
