import { Alert, Linking } from "react-native";

export interface PermisoLike {
  granted: boolean;
  canAskAgain?: boolean;
}

/**
 * REQ-APK-016: si un permiso quedó **denegado permanentemente**
 * (`canAskAgain === false`), ofrece abrir los Ajustes del sistema; si todavía
 * se puede volver a preguntar, no hace nada (el caller muestra su mensaje).
 */
export function ofrecerAbrirAjustes(permiso: PermisoLike, mensaje: string): void {
  if (permiso.granted || permiso.canAskAgain !== false) {
    return;
  }
  Alert.alert("Permiso bloqueado", mensaje, [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Abrir Ajustes",
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
}
