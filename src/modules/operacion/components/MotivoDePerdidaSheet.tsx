import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { shSpace } from "@core/theme/tokens";
import { Button, Field, RadioGroup, Sheet, TextField } from "@shared/ui";
import { NOTA_PERDIDA_MAX } from "../etapas";

export interface MotivoDePerdidaSheetProps {
  visible: boolean;
  nombre: string;
  motivos: { value: string; label: string }[];
  onConfirmar: (motivo: string, nota: string) => void;
  onClose: () => void;
}

/**
 * Hoja que pide el motivo al pasar un lead a «perdido» (HU-CRM-23): el motivo es obligatorio y la nota,
 * opcional. La etapa no cambia hasta confirmar; cerrar la hoja deja todo como estaba.
 */
export function MotivoDePerdidaSheet({ visible, nombre, motivos, onConfirmar, onClose }: MotivoDePerdidaSheetProps) {
  const [motivo, setMotivo] = useState<string | undefined>();
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | undefined>();

  // El formulario vuelve a empezar vacío cada vez que se cierra o se confirma.
  const vaciar = () => {
    setMotivo(undefined);
    setNota("");
    setError(undefined);
  };
  const cerrar = () => {
    vaciar();
    onClose();
  };
  const confirmar = () => {
    if (!motivo) {
      setError("Elige el motivo de la pérdida.");
      return;
    }
    const notaLimpia = nota.trim();
    vaciar();
    onConfirmar(motivo, notaLimpia);
  };

  return (
    <Sheet
      visible={visible}
      onClose={cerrar}
      title="¿Por qué se perdió?"
      description={`Elige el motivo para marcar a ${nombre} como perdido. Queda en su historia.`}
      testID="motivo-sheet"
      footer={
        <>
          <Button testID="motivo-cancelar" variant="secondary" onPress={cerrar} style={styles.flex}>
            Cancelar
          </Button>
          <Button testID="motivo-confirmar" onPress={confirmar} style={styles.flex}>
            Marcar como perdido
          </Button>
        </>
      }
    >
      <View style={styles.cuerpo}>
        <Field label="Motivo de la pérdida" required error={error} testID="motivo-campo">
          <RadioGroup
            label="Motivo de la pérdida"
            testID="motivo"
            value={motivo}
            options={motivos.map((m) => ({ value: m.value, label: m.label }))}
            onValueChange={(valor) => {
              setMotivo(valor);
              setError(undefined);
            }}
          />
        </Field>
        <Field label="Nota (opcional)" hint={`Hasta ${NOTA_PERDIDA_MAX} caracteres.`}>
          <TextField
            testID="motivo-nota"
            value={nota}
            onChangeText={setNota}
            maxLength={NOTA_PERDIDA_MAX}
            multiline
          />
        </Field>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: shSpace[3] },
  flex: { flex: 1 },
});
