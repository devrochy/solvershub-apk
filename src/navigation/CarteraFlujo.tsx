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
import { aCarteraActiva, useCarteraActiva } from "../session/cartera-activa-context";
import { useSession } from "../session/session-context";
import type { FiltroClientes } from "../domain/filtro-clientes";
import type { CarteraApkPublic } from "../types/gestor";
import type { RootStackParamList } from "./types";

type Seccion = "Cartera" | "TrayectoDiario" | "Clientes";

type Props = NativeStackScreenProps<RootStackParamList, "Cartera">;

const FILTROS: { key: FiltroClientes; label: string; icon: string }[] = [
  { key: "todos", label: "Todos", icon: "list" },
  { key: "al_dia", label: "Al día", icon: "check-circle" },
  { key: "en_mora", label: "En mora", icon: "warning" },
  { key: "sin_prestamos", label: "Sin préstamos", icon: "money-off" },
];

/**
 * Flujo de cartera a pantalla completa. Las secciones se eligen desde el menú
 * lateral: **Inicio** (info), **Carteras** (desplegable, solo si hay >1),
 * **Clientes** (desplegable con filtros) y **Diario**. Abre por defecto en Inicio.
 */
export function CarteraFlujo({ route, navigation }: Props) {
  const [seccion, setSeccion] = useState<Seccion>(route.params?.seccion ?? "Cartera");
  const [filtro, setFiltro] = useState<FiltroClientes>("todos");
  const [carteras, setCarteras] = useState<CarteraApkPublic[]>([]);
  const { api } = useSession();
  const { carteraActiva, setCarteraActiva } = useCarteraActiva();
  const { setItemsExtra } = useMenuLateral();
  const { pantalla, cerrar } = usePantallaActiva();
  const { contenido: trayectosAbiertos, cerrar: cerrarTrayectos } = useTrayectosOverlay();

  useEffect(() => {
    let activo = true;
    api
      .misCarteras()
      .then((lista) => {
        if (activo) {
          setCarteras(lista);
        }
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [api]);

  useEffect(() => {
    const items: MenuItem[] = [
      {
        key: "seccion-inicio",
        label: "Inicio",
        icon: "home",
        activo: seccion === "Cartera",
        onPress: () => setSeccion("Cartera"),
      },
    ];

    if (carteras.length > 1) {
      items.push({
        key: "carteras-lista",
        label: "Carteras",
        icon: "map",
        subItems: carteras.map((c) => ({
          key: `car-${c.id}`,
          label: c.nombre,
          icon:
            c.id === carteraActiva?.carteraId
              ? "radio-button-checked"
              : "radio-button-unchecked",
          activo: c.id === carteraActiva?.carteraId,
          onPress: () => {
            setCarteraActiva(aCarteraActiva(c));
            setSeccion("Cartera");
          },
        })),
      });
    }

    items.push({
      key: "seccion-clientes",
      label: "Clientes",
      icon: "people",
      activo: seccion === "Clientes",
      subItems: FILTROS.map((f) => ({
        key: `filtro-${f.key}`,
        label: f.label,
        icon: f.icon,
        activo: seccion === "Clientes" && filtro === f.key,
        onPress: () => {
          setSeccion("Clientes");
          setFiltro(f.key);
        },
      })),
    });

    items.push({
      key: "seccion-diario",
      label: "Diario",
      icon: "route",
      activo: seccion === "TrayectoDiario",
      onPress: () => setSeccion("TrayectoDiario"),
    });

    setItemsExtra(items);
    return () => setItemsExtra([]);
  }, [seccion, filtro, carteras, carteraActiva, setCarteraActiva, setItemsExtra]);

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
