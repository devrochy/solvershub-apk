import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { SeleccionCarteraScreen } from "./SeleccionCarteraScreen";

/**
 * Pestaña "Carteras": lista de carteras del gestor/propietario. Al elegir una cartera se
 * abre el flujo de cartera a pantalla completa (`Cartera`).
 */
export function CarterasScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <SeleccionCarteraScreen onCarteraSeleccionada={() => navigation.navigate("Cartera")} />
  );
}
