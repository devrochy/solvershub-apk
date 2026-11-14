import { StyleSheet, Text, View } from "react-native";
import { useCentroNotificaciones } from "@core/notificaciones/centro-context";
import { shRadius } from "@core/theme/tokens";
import { IconButton } from "./IconButton";
import { useKit } from "./tema";

/** Texto del globo: tope `99+`. */
export function textoContador(n: number): string {
  return n > 99 ? "99+" : String(n);
}

export interface CampanaNotificacionesProps {
  noLeidas: number;
  onPress: () => void;
  /** Aviso de plan Free activo (HU-BILL-15): punto cuando no hay no leídas. */
  avisoPlan?: boolean;
  testID?: string;
}

/**
 * Campana de notificaciones (presentacional): botón de 48 dp con el contador de no leídas.
 * El nombre accesible lleva el número; el globo es decorativo. Siempre arriba a la derecha.
 */
export function CampanaNotificaciones({
  noLeidas,
  onPress,
  avisoPlan = false,
  testID = "campana-notificaciones",
}: CampanaNotificacionesProps) {
  const { c } = useKit();
  const etiqueta =
    noLeidas > 0
      ? `Notificaciones, ${textoContador(noLeidas)} sin leer`
      : avisoPlan
        ? "Notificaciones, tienes un aviso de plan"
        : "Notificaciones";
  return (
    <View>
      <IconButton testID={testID} icon="notifications-none" label={etiqueta} onPress={onPress} />
      {noLeidas > 0 ? (
        <View
          testID={`${testID}-globo`}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.globo, { backgroundColor: c.statusDangerFg }]}
        >
          <Text style={[styles.numero, { color: c.bg }]}>{textoContador(noLeidas)}</Text>
        </View>
      ) : avisoPlan ? (
        <View
          testID={`${testID}-plan`}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.punto, { backgroundColor: c.link }]}
        />
      ) : null}
    </View>
  );
}

/** La campana conectada al centro montado por el módulo `notificaciones` (o nada, sin centro). */
export function CampanaDelPanel({ avisoPlan = false }: { avisoPlan?: boolean }) {
  const centro = useCentroNotificaciones();
  if (!centro.disponible) return null;
  return <CampanaNotificaciones noLeidas={centro.noLeidas} onPress={centro.abrir} avisoPlan={avisoPlan} />;
}

const styles = StyleSheet.create({
  globo: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: shRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  numero: { fontSize: 11, lineHeight: 14, fontWeight: "700" },
  punto: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: shRadius.pill },
});
