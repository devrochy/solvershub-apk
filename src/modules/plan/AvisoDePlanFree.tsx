import { StyleSheet, Text, View } from "react-native";
import { useAdminSession } from "@core/session/admin-session-context";
import { shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Button, IconButton, Icono, useKit } from "@shared/ui";

import { avisoDePlanFree, puedeMejorarPlan, type AvisoDePlan } from "./plan-free";

/**
 * Banner fijo de plan Free (HU-BILL-15) bajo el header del panel: aparece en todos los
 * módulos mientras el negocio no tenga un plan pago. El cierre dura la vista actual; al
 * cambiar de módulo o reiniciar la app vuelve, también en Consumo y plan. El CTA abre esa
 * pantalla, que explica el checkout web.
 */
export function AvisoDePlanFree() {
  const { sesion, avisoPlanCerrado, cerrarAvisoPlan } = useAdminSession();
  const aviso = avisoDePlanFree(sesion?.plan);
  if (!sesion || !aviso || avisoPlanCerrado) return null;
  if (!puedeMejorarPlan(sesion.permissions, sesion.role === "master")) return null;

  return (
    <BannerPlanFree
      aviso={aviso}
      onCerrar={cerrarAvisoPlan}
      onMejorar={() => emitirNavegacion({ tab: "negocio", pestana: "plan" })}
    />
  );
}

/** Parte presentacional (testeable sin sesión ni navegación). */
export function BannerPlanFree({
  aviso,
  onCerrar,
  onMejorar,
}: {
  aviso: AvisoDePlan;
  onCerrar: () => void;
  onMejorar: () => void;
}) {
  const { tonos } = useKit();
  const t = tonos[aviso.tono];
  return (
    <View
      testID="aviso-plan-free"
      accessibilityRole={aviso.tono === "danger" ? "alert" : "summary"}
      style={[styles.banda, { backgroundColor: t.bg, borderBottomColor: t.border }]}
    >
      <View style={styles.fila}>
        <Icono name="workspace-premium" size={22} color={t.fg} />
        <View style={styles.texto}>
          <Text style={[shType.label, { color: t.fg }]}>{aviso.titulo}</Text>
          <Text style={[shType.caption, { color: t.fg }]}>{aviso.texto}</Text>
        </View>
        <IconButton
          testID="aviso-plan-cerrar"
          icon="close"
          label="Cerrar el aviso de plan"
          size="sm"
          onPress={onCerrar}
        />
      </View>
      <Button testID="aviso-plan-mejorar" variant="secondary" size="sm" fullWidth onPress={onMejorar}>
        {aviso.cta}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    gap: shSpace[2],
    paddingHorizontal: shSpace[4],
    paddingVertical: shSpace[2],
    borderBottomWidth: 1,
  },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[2] },
  texto: { flex: 1, gap: 2 },
});
