import { IconButton } from "@shared/ui";
import { useMenuLateral } from "../navigation/menu-lateral-context";

/**
 * Botón hamburguesa que abre/cierra el menú lateral. Va en el header, sobre la
 * banda de marca (`IconButton` del kit en tono `inverse`, blanco de 48 dp).
 */
export function BotonMenu() {
  const { alternar } = useMenuLateral();

  return <IconButton testID="btn-menu" icon="menu" label="Abrir menú" tone="inverse" onPress={alternar} />;
}
