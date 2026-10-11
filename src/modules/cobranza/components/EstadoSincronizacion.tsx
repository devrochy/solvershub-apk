import { useCallback, useContext, useState } from "react";
import { StyleSheet, View } from "react-native";
import { shSpace } from "@core/theme/tokens";
import { SyncStatus, useKit, type SyncState } from "@shared/ui";
import { OfflineContext } from "../offline/offline-context";

/**
 * Estado del chip a partir de lo que el motor offline YA expone (ADR-APP-04):
 * sin red → `offline`; con red y un error guardado → `error`; mientras corre el
 * reintento pedido desde el chip → `syncing`; si no, `online`.
 */
export function estadoDeSync({
  isOnline,
  errorSync,
  sincronizando,
}: {
  isOnline: boolean;
  errorSync: string | null;
  sincronizando: boolean;
}): SyncState {
  if (!isOnline) return "offline";
  if (sincronizando) return "syncing";
  if (errorSync) return "error";
  return "online";
}

/**
 * Franja del header de campo con el `SyncStatus` del kit (HU-DS-10, SPEC-29
 * §5): "Sin conexión · 3 cambios por enviar", "Sincronizado", etc. Lee el
 * `OfflineContext` sin exigirlo (fuera del provider no se muestra) y no cambia
 * el motor: "Reintentar" llama a la misma `sincronizar()` de siempre.
 */
export function EstadoSincronizacion() {
  const offline = useContext(OfflineContext);
  const { c } = useKit();
  const [sincronizando, setSincronizando] = useState(false);
  const sincronizar = offline?.sincronizar;

  const reintentar = useCallback(() => {
    if (!sincronizar) return;
    setSincronizando(true);
    sincronizar()
      .catch(() => undefined)
      .finally(() => setSincronizando(false));
  }, [sincronizar]);

  if (!offline) return null;

  const estado = estadoDeSync({
    isOnline: offline.isOnline,
    errorSync: offline.errorSync,
    sincronizando,
  });

  return (
    <View
      testID="header-sync"
      style={[styles.franja, { backgroundColor: c.surface, borderBottomColor: c.borderSoft }]}
    >
      <SyncStatus
        testID="sync-status"
        state={estado}
        pending={offline.sinSubir}
        onRetry={reintentar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  franja: {
    paddingHorizontal: shSpace[4],
    paddingVertical: shSpace[1],
    borderBottomWidth: 1,
  },
});
