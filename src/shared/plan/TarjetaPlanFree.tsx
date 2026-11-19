import { StyleSheet, Text, View } from "react-native";
import { useAdminSessionOpcional } from "@core/session/admin-session-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { emitirNavegacion } from "@shared/navegacion-evento";
import { Button, IconButton, Icono, useKit } from "@shared/ui";

import { avisoDePlanFree, puedeMejorarPlan, type AvisoDePlan } from "./plan-free";

/**
 * Tarjeta fija de plan Free dentro de la campana (HU-BILL-15). No es una notificación
 * persistida: se deriva del plan para que siga apareciendo aunque se marque todo como leído.
 * Comparte el cierre temporal del banner y también se muestra en Consumo y plan.
 */
export function TarjetaPlanFree({ onCerrar }: { onCerrar: () => void }) {
  const ctx = useAdminSessionOpcional();
  const sesion = ctx?.sesion;
  const aviso = avisoDePlanFree(sesion?.plan);
  if (!ctx || !sesion || !aviso || ctx.avisoPlanCerrado) return null;
  if (!puedeMejorarPlan(sesion.permissions, sesion.role === "master")) return null;

  return (
    <TarjetaPlanFreePresentacional
      aviso={aviso}
      onCerrar={ctx.cerrarAvisoPlan}
      onMejorar={() => {
        onCerrar();
        emitirNavegacion({ tab: "negocio", pestana: "plan" });
      }}
    />
  );
}

/** Parte presentacional (testeable sin sesión ni navegación). */
export function TarjetaPlanFreePresentacional({
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
      testID="tarjeta-plan-free"
      style={[styles.tarjeta, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <View style={styles.fila}>
        <Icono name="workspace-premium" size={20} color={t.fg} />
        <View style={styles.texto}>
          <Text style={[shType.label, { color: t.fg }]}>{aviso.titulo}</Text>
          <Text style={[shType.caption, { color: t.fg }]}>{aviso.texto}</Text>
        </View>
        <IconButton
          testID="tarjeta-plan-cerrar"
          icon="close"
          label="Cerrar el aviso de plan"
          size="sm"
          onPress={onCerrar}
        />
      </View>
      <Button testID="tarjeta-plan-mejorar" variant="secondary" size="sm" fullWidth onPress={onMejorar}>
        {aviso.cta}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[3],
    marginHorizontal: shSpace[3],
    marginTop: shSpace[3],
    gap: shSpace[2],
  },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[2] },
  texto: { flex: 1, gap: 2 },
});
