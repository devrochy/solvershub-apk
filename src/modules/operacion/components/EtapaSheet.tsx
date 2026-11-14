import { RadioGroup, Sheet } from "@shared/ui";
import type { OpcionDeEtapa } from "../etapas";

export interface EtapaSheetProps {
  visible: boolean;
  nombre: string;
  /** Código de la etapa actual; `undefined` si no se pudo resolver. */
  actual?: string;
  opciones: OpcionDeEtapa[];
  onElegir: (etapa: OpcionDeEtapa) => void;
  onClose: () => void;
}

/**
 * Hoja para cambiar la etapa del lead desde la lista (HU-CRM-19). Elegir una etapa distinta aplica el
 * cambio y cierra: no hay botón de guardar, porque el cambio queda en la historia y se puede revertir.
 */
export function EtapaSheet({ visible, nombre, actual, opciones, onElegir, onClose }: EtapaSheetProps) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Cambiar etapa"
      description={`¿En qué etapa está ${nombre}?`}
      testID="etapa-sheet"
    >
      <RadioGroup
        label={`Etapa de ${nombre}`}
        testID="etapa"
        value={actual}
        options={opciones.map((o) => ({ value: o.value, label: o.label, icono: o.icon }))}
        onValueChange={(valor) => {
          const elegida = opciones.find((o) => o.value === valor);
          if (!elegida) return;
          if (elegida.value === actual) onClose();
          else onElegir(elegida);
        }}
      />
    </Sheet>
  );
}
