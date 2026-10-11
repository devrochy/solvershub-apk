import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { apiErrorStatus } from "@core/api/client";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, EmptyState, Icono, KpiTile, Skeleton, useKit, type KitTema } from "@shared/ui";
import { CargaError } from "../components/CargaError";
import { ColorBadge, bordeDeEstado, fondoDeEstado } from "../components/ColorBadge";
import { contarEnMora } from "@shared/domain/contar-en-mora";
import { HeaderApp } from "../components/HeaderApp";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { useOffline } from "../offline/offline-context";
import { useSession } from "../session/session-context";
import { useCarteraActiva, aCarteraActiva } from "../session/cartera-activa-context";
import { useMenuLateral, type MenuItem } from "../navigation/menu-lateral-context";

import type { CarteraApkPublic } from "@shared/types/gestor";

interface CarteraKpi {
  totalClientes: number;
  clientesDia: number;
  enMora: number;
}

/**
 * Selección de cartera (N1): pantalla de stack mostrada tras el login SIN tab
 * bar. Lista las carteras del gestor con KPIs de cartera. Al tocar una cartera se
 * fija como cartera activa y se navega al Main (tabs), que abre por defecto en
 * la pestaña "Trayecto diario".
 */
export interface SeleccionCarteraScreenProps {
  /** Se invoca al elegir una cartera (para abrir la capa de pestañas encima). */
  onCarteraSeleccionada?: () => void;
}

export function SeleccionCarteraScreen({
  onCarteraSeleccionada,
}: SeleccionCarteraScreenProps = {}) {
  const { api, gestor, logout } = useSession();
  const { setCarteraActiva } = useCarteraActiva();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const offline = useOffline();
  const [carteras, setCarteras] = useState<CarteraApkPublic[] | null>(null);
  const [kpis, setKpis] = useState<Record<string, CarteraKpi>>({});
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [filtroEstatus, setFiltroEstatus] = useState<"activo" | "inactivo">("activo");
  const [reintentandoSync, setReintentandoSync] = useState(false);

  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const misCarteras = (await api.misCarteras()).filter(
        (cartera) => !cartera.config.ocultarCartera,
      );
      const resultados = await Promise.all(
        misCarteras.map(async (cartera) => {
          const [clientes, trayectoDiario] = await Promise.allSettled([
            api.listarClientesDeCartera(cartera.id),
            api.trayectoDiario(cartera.id),
          ]);
          const listaClientes =
            clientes.status === "fulfilled" ? clientes.value : [];
          const diaCartera = trayectoDiario.status === "fulfilled" ? trayectoDiario.value : null;
          return {
            carteraId: cartera.id,
            totalClientes: listaClientes.length,
            clientesDia: diaCartera?.clientes.length ?? 0,
            enMora: diaCartera ? contarEnMora(diaCartera.clientes) : 0,
          };
        }),
      );
      setCarteras(misCarteras);
      setKpis(Object.fromEntries(resultados.map((k) => [k.carteraId, k])));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar tus carteras.");
      }
    }
  }, [api, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar, offline.versionRecarga]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function reintentarSync() {
    setReintentandoSync(true);
    try {
      await offline.sincronizar();
    } catch {
      // El mensaje se mantiene en el aviso (offline.errorSync).
    } finally {
      setReintentandoSync(false);
    }
  }

  function seleccionarCartera(cartera: CarteraApkPublic) {
    setCarteraActiva(aCarteraActiva(cartera));
    onCarteraSeleccionada?.();
  }

  // Inicio: con una sola cartera se fija activa y se navega directo al detalle
  // (una vez). El callback va por ref para no depender de su identidad.
  const autoSeleccion = useRef(false);
  const onSeleccionadaRef = useRef(onCarteraSeleccionada);
  useEffect(() => {
    onSeleccionadaRef.current = onCarteraSeleccionada;
  });
  useEffect(() => {
    if (autoSeleccion.current || !carteras || carteras.length !== 1) {
      return;
    }
    autoSeleccion.current = true;
    setCarteraActiva(aCarteraActiva(carteras[0]));
    onSeleccionadaRef.current?.();
  }, [carteras, setCarteraActiva]);

  // Menú: Inicio y, si hay más de una cartera, Carteras (desplegable).
  const { setItemsExtra } = useMenuLateral();
  const seleccionRef = useRef(seleccionarCartera);
  const navigationRef = useRef(navigation);
  useEffect(() => {
    seleccionRef.current = seleccionarCartera;
    navigationRef.current = navigation;
  });
  useEffect(() => {
    const items: MenuItem[] = [
      {
        key: "seccion-inicio",
        label: "Inicio",
        icon: "home",
        activo: true,
        onPress: () => navigationRef.current.navigate("Main"),
      },
    ];
    if (carteras && carteras.length > 1) {
      items.push({
        key: "carteras-lista",
        label: "Carteras",
        icon: "map",
        subItems: carteras.map((c) => ({
          key: `car-${c.id}`,
          label: c.nombre,
          icon: "circle",
          color: c.estatus === "activo" ? kit.tonos.success.fg : kit.tonos.danger.fg,
          onPress: () => seleccionRef.current(c),
        })),
      });
    }
    setItemsExtra(items);
    return () => setItemsExtra([]);
  }, [carteras, setItemsExtra, kit]);

  if (!carteras) {
    if (!error) {
      // Carga inicial: esqueleto con la forma de las tarjetas (HU-DS-10).
      return (
        <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
          <HeaderApp titulo={`Hola, ${gestor?.nombre ?? "gestor"}`} subtitulo="Selecciona una cartera" />
          <View testID="carteras-cargando" accessibilityState={{ busy: true }} accessibilityLabel="Cargando carteras" style={styles.lista}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.tarjeta, styles.tarjetaEsqueleto]}>
                <Skeleton shape="text" width="50%" height={16} />
                <View style={styles.kpis}>
                  <Skeleton shape="rect" height={88} width="31%" />
                  <Skeleton shape="rect" height={88} width="31%" />
                  <Skeleton shape="rect" height={88} width="31%" />
                </View>
              </View>
            ))}
          </View>
        </SafeAreaView>
      );
    }
    return <CargaError cargando={false} error={error} onReintentar={cargar} />;
  }

  const carterasFiltradas = carteras.filter((cartera) =>
    filtroEstatus === "activo"
      ? cartera.estatus === "activo"
      : cartera.estatus !== "activo",
  );

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp
        titulo={`Hola, ${gestor?.nombre ?? "gestor"}`}
        subtitulo="Selecciona una cartera"
        acciones={
          offline.sinSubir > 0 ? (
            <View testID="badge-sin-subir" style={styles.badge}>
              <Badge tone="warning" icon="cloud-upload" label={`${offline.sinSubir} sin subir`} />
            </View>
          ) : null
        }
      />

      {carteras.length === 1 ? (
        <CargaError cargando error={null} onReintentar={cargar} />
      ) : (
        <>
      <View style={styles.tabs} accessibilityRole="tablist">
        {(["activo", "inactivo"] as const).map((est) => {
          const elegido = filtroEstatus === est;
          return (
            <Pressable
              key={est}
              testID={`filtro-carteras-${est}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: elegido }}
              android_ripple={{ color: elegido ? kit.ripple.relleno : kit.ripple.superficie }}
              style={[styles.tab, elegido && styles.tabActivo]}
              onPress={() => setFiltroEstatus(est)}
            >
              <Text style={elegido ? styles.tabTextoActivo : styles.tabTexto}>
                {est === "activo" ? "Activas" : "Inactivas"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {offline.errorSync ? (
        <View testID="aviso-error-sync" style={styles.avisoErrorSync} accessibilityLiveRegion="polite">
          <View style={styles.avisoFila}>
            <Icono name="sync-problem" size={18} color={c.statusDangerFg} />
            <Text style={styles.avisoErrorSyncTexto}>{offline.errorSync}</Text>
          </View>
          <Button
            testID="btn-reintentar-sync"
            variant="secondary"
            size="sm"
            iconLeft="refresh"
            disabled={reintentandoSync}
            style={styles.reintentar}
            onPress={() => void reintentarSync()}
          >
            {reintentandoSync ? "Reintentando…" : "Reintentar"}
          </Button>
        </View>
      ) : null}

      {error && carteras ? (
        <View testID="aviso-error-refresh" style={styles.avisoErrorSync} accessibilityLiveRegion="polite">
          <View style={styles.avisoFila}>
            <Icono name="error-outline" size={18} color={c.statusDangerFg} />
            <Text style={styles.avisoErrorSyncTexto}>{error}</Text>
          </View>
        </View>
      ) : null}

      <FlatList
        testID="lista-carteras"
        data={carterasFiltradas}
        keyExtractor={(cartera) => String(cartera.id)}
        contentContainerStyle={styles.lista}
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={refrescar} colors={[c.link]} tintColor={c.link} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="account-balance-wallet"
            title="No tienes carteras asignadas."
            description="Cuando el administrador te asigne una cartera, aparecerá aquí."
            action={{ label: "Actualizar", onPress: () => void refrescar() }}
          />
        }
        renderItem={({ item }) => {
          const kpi = kpis[item.id] ?? {
            totalClientes: 0,
            clientesDia: 0,
            enMora: 0,
          };
          const activa = item.estatus === "activo";
          const claveEstado = activa ? "verde" : "rojo";
          return (
            <Pressable
              testID={`cartera-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.nombre}, ${activa ? "activa" : "inactiva"}`}
              accessibilityHint="Abre la cartera"
              android_ripple={{ color: kit.ripple.superficie }}
              style={[
                styles.tarjeta,
                { borderColor: bordeDeEstado(claveEstado, kit.tema) },
                !activa && styles.tarjetaInactiva,
              ]}
              onPress={() => seleccionarCartera(item)}
            >
              <View
                testID={`cartera-header-${item.id}`}
                style={[
                  styles.tarjetaHeader,
                  { backgroundColor: fondoDeEstado(claveEstado, kit.tema) },
                ]}
              >
                <ColorBadge color={claveEstado} animar />
                <Text style={styles.tarjetaHeaderTexto}>{item.nombre}</Text>
                <MaterialIcons name="chevron-right" size={28} color={c.textSoft} />
              </View>
              <View style={styles.kpis}>
                <View style={styles.kpi}>
                  <KpiTile testID={`kpi-clientes-${item.id}`} label="Clientes" value={String(kpi.totalClientes)} />
                </View>
                <View style={styles.kpi}>
                  <KpiTile testID={`kpi-trayectoDiario-${item.id}`} label="Del día" value={String(kpi.clientesDia)} />
                </View>
                <View style={styles.kpi}>
                  <KpiTile testID={`kpi-mora-${item.id}`} label="En mora" value={String(kpi.enMora)} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
        </>
      )}
    </SafeAreaView>
  );
}

function crearEstilos({ c, relleno }: KitTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    tabs: {
      flexDirection: "row",
      gap: shSpace[2],
      paddingHorizontal: shSpace[4],
      paddingTop: shSpace[3],
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: shDensity.controlLg,
      borderRadius: shRadius.pill,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    tabActivo: { backgroundColor: relleno.primario, borderColor: relleno.primario },
    tabTexto: { ...shType.label, fontFamily: shType.block.fontFamily, color: c.text },
    tabTextoActivo: { ...shType.label, fontFamily: shType.hero.fontFamily, color: relleno.sobrePrimario },
    // El badge del kit va sobre una pastilla de superficie para leerse sobre la banda.
    badge: { backgroundColor: c.surface, borderRadius: shRadius.sm },
    avisoErrorSync: {
      backgroundColor: c.statusDangerBg,
      borderWidth: 1,
      borderColor: c.statusDangerBorder,
      marginHorizontal: shSpace[4],
      marginTop: shSpace[3],
      borderRadius: shRadius.sm,
      paddingHorizontal: shSpace[3],
      paddingVertical: shSpace[2],
      gap: shSpace[2],
    },
    avisoFila: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
    reintentar: { alignSelf: "flex-start" },
    avisoErrorSyncTexto: { ...shType.dense, flex: 1, color: c.statusDangerFg },
    lista: { padding: shSpace[4], gap: shSpace[3], paddingBottom: 72 },
    tarjeta: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    tarjetaEsqueleto: { padding: shSpace[4], gap: shSpace[3] },
    tarjetaHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: shSpace[2],
      minHeight: shDensity.controlLg,
      paddingLeft: shSpace[4],
      paddingRight: shSpace[2],
      paddingVertical: shSpace[1],
    },
    tarjetaHeaderTexto: { ...shType.block, flex: 1, color: c.text },
    tarjetaInactiva: { opacity: 0.75 },
    kpis: { flexDirection: "row", gap: shSpace[2], padding: shSpace[3], justifyContent: "space-between" },
    kpi: { flex: 1 },
  });
}
