import { useCallback, useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OverlaysActivos } from "./OverlaysActivos";
import { usePantallaActiva } from "./pantalla-activa-context";
import { useTrayectosOverlay } from "./trayectos-overlay-context";
import { useMenuLateral, type MenuItem } from "./menu-lateral-context";
import { CarteraDetalleScreen } from "../screens/CarteraDetalleScreen";
import { TrayectoDiarioScreen } from "../screens/TrayectoDiarioScreen";
import { ClientesScreen } from "../screens/ClientesScreen";
import type { FiltroClientes } from "../domain/filtro-clientes";
import type { RootStackParamList } from "./types";

type Seccion = "Cartera" | "TrayectoDiario" | "Clientes";

type Props = NativeStackScreenProps<RootStackParamList, "Cartera">;

/**
 * Flujo de cartera a pantalla completa. Las secciones (Cartera/info, Trayecto
 * diario, Clientes) y los filtros de clientes se eligen desde el menú lateral;
 * abre por defecto en "Cartera" (información).
 */
export function CarteraFlujo({ route, navigation }: Props) {
  const [seccion, setSeccion] = useState<Seccion>(route.params?.seccion ?? "Cartera");
  const [filtro, setFiltro] = useState<FiltroClientes>("todos");
  const { setItemsExtra } = useMenuLateral();
  const { pantalla, cerrar } = usePantallaActiva();
  const { contenido: trayectosAbiertos, cerrar: cerrarTrayectos } = useTrayectosOverlay();

  useEffect(() => {
    const items: MenuItem[] = [
      {
        key: "seccion-cartera",
        label: "Cartera",
        icon: "store",
        activo: seccion === "Cartera",
        onPress: () => setSeccion("Cartera"),
      },
      {
        key: "seccion-trayecto",
        label: "Trayecto diario",
        icon: "route",
        activo: seccion === "TrayectoDiario",
        onPress: () => setSeccion("TrayectoDiario"),
      },
      {
        key: "seccion-clientes",
        label: "Clientes",
        icon: "people",
        activo: seccion === "Clientes",
        onPress: () => setSeccion("Clientes"),
      },
    ];

    if (seccion === "Clientes") {
      items.push(
        {
          key: "filtro-todos",
          label: "Todos",
          icon: "list",
          activo: filtro === "todos",
          onPress: () => setFiltro("todos"),
        },
        {
          key: "filtro-al-dia",
          label: "Al día",
          icon: "check-circle",
          activo: filtro === "al_dia",
          onPress: () => setFiltro("al_dia"),
        },
        {
          key: "filtro-en-mora",
          label: "En mora",
          icon: "warning",
          activo: filtro === "en_mora",
          onPress: () => setFiltro("en_mora"),
        },
        {
          key: "filtro-sin-prestamos",
          label: "Sin préstamos",
          icon: "money-off",
          activo: filtro === "sin_prestamos",
          onPress: () => setFiltro("sin_prestamos"),
        },
      );
    }

    setItemsExtra(items);
    return () => setItemsExtra([]);
  }, [seccion, filtro, setItemsExtra]);

  const volver = useCallback(() => navigation.navigate("Main"), [navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pantalla) {
        cerrar();
        return true;
      }
      if (trayectosAbiertos) {
        cerrarTrayectos();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [pantalla, cerrar, trayectosAbiertos, cerrarTrayectos]);

  return (
    <View style={styles.fill}>
      {seccion === "Cartera" ? <CarteraDetalleScreen onCerrar={volver} /> : null}
      {seccion === "TrayectoDiario" ? <TrayectoDiarioScreen /> : null}
      {seccion === "Clientes" ? (
        <ClientesScreen filtro={filtro} onFiltroChange={setFiltro} />
      ) : null}
      <OverlaysActivos />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
