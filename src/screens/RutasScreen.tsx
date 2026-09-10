import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SeleccionRutaScreen } from "./SeleccionRutaScreen";

/**
 * Pestaña "Rutas": lista de rutas del cobrador/socio. Al elegir una ruta se
 * abre el flujo de ruta a pantalla completa (`Ruta`).
 */
export function RutasScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SeleccionRutaScreen onRutaSeleccionada={() => navigation.navigate("Ruta")} />
  );
}
