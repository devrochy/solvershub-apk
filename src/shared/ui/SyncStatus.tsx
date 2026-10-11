import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Icono, type IconName } from "./icono";
import { useKit, type TonoEstado } from "./tema";

export type SyncState = "online" | "offline" | "syncing" | "error";

export interface SyncStatusProps {
  state: SyncState;
  /** Cambios guardados en el teléfono que faltan por enviar. */
  pending?: number;
  /** Con `state="error"`, el chip pasa a ser un botón "Reintentar". */
  onRetry?: () => void;
  testID?: string;
}

const APARIENCIA: Record<SyncState, { icono: IconName; tono: TonoEstado }> = {
  online: { icono: "cloud-done", tono: "success" },
  offline: { icono: "cloud-off", tono: "warning" },
  syncing: { icono: "sync", tono: "info" },
  error: { icono: "sync-problem", tono: "danger" },
};

function cambios(n: number): string {
  return n === 1 ? "1 cambio" : `${n} cambios`;
}

/** Texto del chip: "Sin conexión · 3 cambios por enviar". */
export function textoSyncStatus(state: SyncState, pending = 0): string {
  const cola = pending > 0 ? ` · ${cambios(pending)} por enviar` : "";
  switch (state) {
    case "online":
      return pending > 0 ? `En línea${cola}` : "Sincronizado";
    case "offline":
      return `Sin conexión${cola}`;
    case "syncing":
      return pending > 0 ? `Enviando ${cambios(pending)}…` : "Sincronizando…";
    case "error":
      return `No se pudo sincronizar${cola}`;
  }
}

/**
 * Chip de estado de sincronización (SPEC-29 §5: permanente en el header de
 * campo). Texto + ícono, nunca solo color; es región viva para que TalkBack
 * anuncie los cambios. El motor offline no cambia (ADR-APP-04): este chip solo
 * muestra lo que el motor ya sabe.
 */
export function SyncStatus({ state, pending = 0, onRetry, testID }: SyncStatusProps) {
  const { tonos, ripple } = useKit();
  const { icono, tono } = APARIENCIA[state];
  const t = tonos[tono];
  const texto = textoSyncStatus(state, pending);
  const reintentable = state === "error" && Boolean(onRetry);

  const contenido = (
    <>
      <Icono name={icono} size={16} color={t.fg} />
      <Text maxFontSizeMultiplier={1.6} style={[shType.caption, styles.texto, { color: t.fg }]}>
        {texto}
      </Text>
      {reintentable ? (
        <Text maxFontSizeMultiplier={1.6} style={[shType.label, styles.reintentar, { color: t.fg }]}>
          Reintentar
        </Text>
      ) : null}
    </>
  );

  const caja = [styles.chip, { backgroundColor: t.bg, borderColor: t.border }];

  if (reintentable) {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${texto}. Reintentar`}
        accessibilityLiveRegion="polite"
        onPress={onRetry}
        android_ripple={{ color: ripple.superficie }}
        style={({ pressed }) => [...caja, styles.tactil, pressed && Platform.OS === "ios" && styles.presionadoIos]}
      >
        {contenido}
      </Pressable>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={texto}
      accessibilityLiveRegion="polite"
      accessibilityState={{ busy: state === "syncing" }}
      style={caja}
    >
      {contenido}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: shSpace[1],
    minHeight: shSpace[8],
    paddingHorizontal: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.pill,
    overflow: "hidden",
  },
  tactil: { minHeight: shDensity.controlLg },
  texto: { flexShrink: 1 },
  reintentar: { textDecorationLine: "underline", marginLeft: shSpace[1] },
  presionadoIos: { opacity: 0.85 },
});
