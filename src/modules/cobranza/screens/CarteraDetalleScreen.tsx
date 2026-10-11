import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiErrorStatus, esErrorDeRed } from "@core/api/client";
import { CargaError } from "../components/CargaError";
import { CampoModal } from "../components/CampoModal";
import { contarEnMora } from "@shared/domain/contar-en-mora";
import { etiquetaEstatus } from "@shared/domain/estatus";
import { HeaderApp } from "../components/HeaderApp";
import { estilosHeader } from "../components/HeaderPantalla";
import { ModalConFooter } from "../components/ModalConFooter";
import { guardarEstadisticasCartera, leerEstadisticasCartera } from "../offline/cache";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import { useCarteraActiva } from "../session/cartera-activa-context";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Badge, Button, Icono, KpiTile, useKit, type KitTema } from "@shared/ui";
import type {
  ClienteGestorPublic,
  TrayectoDiarioApkPublic,
  EstadisticasConteosPublic,
  EstadisticasCarteraPublic,
  CarteraNotaPublic,
} from "@shared/types/gestor";

export interface CarteraDetalleScreenProps {
  carteraId?: string;
  carteraNombre?: string;
  onCerrar?(): void;
}

function formatoFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** Pares actual/anterior que muestra la sección de estadísticas. */
const PARES_ESTADISTICA: { campo: keyof EstadisticasConteosPublic; label: string }[] = [
  { campo: "clientesAtrasados", label: "Atrasados" },
  { campo: "clientesVencidos", label: "Vencidos" },
  { campo: "totalClientes", label: "Clientes" },
  { campo: "sinVisitaHoy", label: "No visitados" },
];

/**
 * Detalle de cartera (B3/N3): información de la cartera con KPIs (total clientes,
 * clientes del día, en mora, estado) y sección de notas con alta desde un
 * modal. Se usa como pestaña "Cartera" del menú (lee la cartera activa del contexto)
 * y, opcionalmente, como overlay con props. La edición de cartera es solo lectura
 * por ahora (backlog); la edición real se realiza desde el panel admin.
 */
export function CarteraDetalleScreen({
  carteraId: carteraIdProp,
  carteraNombre: carteraNombreProp,
  onCerrar,
}: CarteraDetalleScreenProps = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { api, logout } = useSession();
  const { carteraActiva, setCarteraActiva } = useCarteraActiva();

  const carteraId = carteraIdProp ?? carteraActiva?.carteraId ?? "";
  const carteraNombre = carteraNombreProp ?? carteraActiva?.carteraNombre ?? "";
  const cerrar = onCerrar ?? (() => navigation.navigate("Main"));

  const [clientes, setClientes] = useState<ClienteGestorPublic[] | null>(null);
  const [trayectoDiario, setDia] = useState<TrayectoDiarioApkPublic | null>(null);
  const [notas, setNotas] = useState<CarteraNotaPublic[] | null>(null);
  const [estatus, setEstatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCarteraPublic | null>(null);
  const [estadisticasOffline, setEstadisticasOffline] = useState(false);

  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaEnviando, setNotaEnviando] = useState(false);
  const [notaMensaje, setNotaMensaje] = useState<string | null>(null);
  const [avisoEdicion, setAvisoEdicion] = useState(false);
  const [nombreCartera, setNombreCartera] = useState(carteraNombre);
  const [editarAbierto, setEditarAbierto] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editTipoInteres, setEditTipoInteres] = useState("");
  const [editNumCuotas, setEditNumCuotas] = useState("");
  const [editEnviando, setEditEnviando] = useState(false);
  const [editMensaje, setEditMensaje] = useState<string | null>(null);

  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el título editado debe reflejar la cartera activa al cambiarla
    setNombreCartera(carteraNombre);
  }, [carteraNombre]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el detalle al cambiar de cartera (no mostrar la anterior)
    setClientes(null);
    setDia(null);
    setNotas(null);
    setEstatus(null);
    setEstadisticas(null);
  }, [carteraId]);

  const cargar = useCallback(async () => {
    if (!carteraId) {
      return;
    }
    setError(null);
    try {
      const [misCarteras, listaClientes, diaCartera, listaNotas] = await Promise.all([
        api.misCarteras(),
        api.listarClientesDeCartera(carteraId),
        api.trayectoDiario(carteraId),
        api.listarNotas(carteraId),
      ]);
      setClientes(listaClientes);
      setDia(diaCartera);
      setNotas(listaNotas);
      setEstatus(misCarteras.find((r) => r.id === carteraId)?.estatus ?? "activo");
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar los datos de la cartera.");
      }
    }
  }, [api, carteraId, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  const cargarEstadisticas = useCallback(async () => {
    if (!carteraId) {
      return;
    }
    try {
      const datos = await api.estadisticasCartera(carteraId);
      setEstadisticas(datos);
      setEstadisticasOffline(false);
      await guardarEstadisticasCartera(carteraId, datos);
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
        return;
      }
      if (esErrorDeRed(err)) {
        const cache = await leerEstadisticasCartera(carteraId);
        if (cache) {
          setEstadisticas(cache);
          setEstadisticasOffline(true);
          return;
        }
      }
      // Las estadísticas no deben bloquear el resto de la pantalla.
      setEstadisticas(null);
    }
  }, [api, logout, carteraId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  function abrirEdicion() {
    setEditNombre(nombreCartera);
    setEditTipoInteres(String(carteraActiva?.tipoInteres ?? ""));
    setEditNumCuotas(String(carteraActiva?.numCuotas ?? ""));
    setEditMensaje(null);
    setEditarAbierto(true);
  }

  async function guardarEdicion() {
    const nombre = editNombre.trim();
    const tipoInteres = Number(editTipoInteres);
    const numCuotas = Number(editNumCuotas);
    if (!nombre) {
      setEditMensaje("El nombre es obligatorio.");
      return;
    }
    if (!Number.isFinite(tipoInteres) || tipoInteres <= 0) {
      setEditMensaje("El interés debe ser mayor que 0.");
      return;
    }
    if (!Number.isInteger(numCuotas) || numCuotas < 1) {
      setEditMensaje("El número de cuotas debe ser al menos 1.");
      return;
    }

    setEditEnviando(true);
    setEditMensaje(null);
    try {
      await api.actualizarCartera(carteraId, { nombre });
      await api.actualizarConfiguracionCartera(carteraId, { tipoInteres, numCuotas });
    } catch (err) {
      setEditEnviando(false);
      setEditMensaje(
        apiErrorStatus(err) === 401 ? "Sesión expirada." : "No se pudo guardar la cartera.",
      );
      return;
    }

    setNombreCartera(nombre);
    if (carteraActiva) {
      setCarteraActiva({ ...carteraActiva, carteraNombre: nombre, tipoInteres, numCuotas });
    }
    setEditEnviando(false);
    setEditarAbierto(false);
    void cargar();
  }

  async function guardarNota() {
    if (!notaTexto.trim()) {
      setNotaMensaje("Escribe el texto de la nota.");
      return;
    }
    setNotaEnviando(true);
    setNotaMensaje(null);
    try {
      await api.crearNota(carteraId, notaTexto.trim());
    } catch {
      setNotaMensaje("No se pudo guardar la nota.");
      setNotaEnviando(false);
      return;
    }
    setNotaTexto("");
    setNotaAbierta(false);
    setNotaEnviando(false);
    // Re-fetch en segundo plano; si falla, la nota ya se guardó y la lista
    // se actualizará en la próxima apertura.
    void cargar();
  }

  if (!carteraId) {
    return (
      <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
        <HeaderApp titulo="Inicio" />
        <View style={styles.sinCartera}>
          <View style={styles.sinCarteraIcono}>
            <Icono name="account-balance-wallet" size={28} color={c.textMuted} />
          </View>
          <Text style={styles.sinCarteraTexto}>Selecciona una cartera para ver su información.</Text>
          <Button testID="btn-ir-seleccion" onPress={cerrar}>
            Seleccionar cartera
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (!clientes || !trayectoDiario || !notas || estatus === null) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const enMora = contarEnMora(trayectoDiario.clientes);
  const puedeEditar = (carteraActiva?.permisos ?? []).some(
    (p) => p.permiso === "actualizar_cartera" && p.habilitado,
  );

  return (
    <View
      testID="cartera-detalle-root"
      style={styles.contenedor}
    >
      <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
        <HeaderApp
          titulo="Inicio"
          subtitulo={nombreCartera}
          acciones={
            <Pressable
              testID="btn-editar-cartera"
              accessibilityRole="button"
              accessibilityLabel="Editar cartera"
              hitSlop={8}
              style={estilosHeader.accionPill}
              onPress={() => (puedeEditar ? abrirEdicion() : setAvisoEdicion(true))}
            >
              <MaterialIcons name="edit" size={18} color={kit.banda.texto} />
              <Text style={estilosHeader.accionPillTexto}>Editar</Text>
            </Pressable>
          }
        />

      {avisoEdicion ? (
        <View style={styles.aviso} accessibilityLiveRegion="polite">
          <Icono name="info-outline" size={18} color={c.statusWarningFg} />
          <Text style={styles.avisoTexto}>
            La edición de cartera se realiza desde el panel.
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContenido}>
        <View style={styles.seccion}>
          <Text accessibilityRole="header" style={styles.seccionTitulo}>Información de la cartera</Text>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <KpiTile testID="kpi-total-clientes" label="Clientes" value={String(clientes.length)} />
            </View>
            <View style={styles.kpi}>
              <KpiTile
                testID="kpi-clientes-trayectoDiario"
                label="Del día"
                value={String(trayectoDiario.clientes.length)}
              />
            </View>
            <View style={styles.kpi}>
              <KpiTile testID="kpi-en-mora" label="En mora" value={String(enMora)} />
            </View>
          </View>
          <View style={styles.estadoFila}>
            <Text style={styles.estadoEtiqueta}>Estado</Text>
            <Text style={styles.estadoValor}>{etiquetaEstatus(estatus)}</Text>
          </View>
        </View>

        {estadisticas ? (
          <View style={styles.seccion} testID="seccion-estadisticas">
            <Text accessibilityRole="header" style={styles.seccionTitulo}>Estadísticas</Text>
            {estadisticasOffline ? (
              <Badge testID="aviso-offline-estadisticas" tone="warning" icon="cloud-off" label="Datos sin conexión" />
            ) : null}
            <View style={styles.pares}>
              {PARES_ESTADISTICA.map(({ campo, label }) => {
                const delta = estadisticas.deltas[campo] ?? null;
                return (
                  <View key={campo} style={styles.par}>
                    <Text style={styles.parValor} maxFontSizeMultiplier={1.6} testID={`estadistica-${campo}`}>
                      {estadisticas.actual[campo]}
                    </Text>
                    <Text style={styles.parEtiqueta}>{label}</Text>
                    <Text style={styles.parAnterior}>
                      {estadisticas.anterior
                        ? `ayer ${estadisticas.anterior[campo]}`
                        : "sin ayer"}
                    </Text>
                    <Text
                      testID={`estadistica-delta-${campo}`}
                      maxFontSizeMultiplier={1.6}
                      style={[
                        styles.parDelta,
                        delta !== null && delta > 0 && styles.parDeltaSube,
                        delta !== null && delta < 0 && styles.parDeltaBaja,
                      ]}
                    >
                      {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.seccion}>
          <View style={styles.seccionFila}>
            <Text accessibilityRole="header" style={styles.seccionTitulo}>Notas</Text>
            <Button
              testID="btn-agregar-nota"
              variant="secondary"
              size="sm"
              iconLeft="add"
              accessibilityHint="Agrega una nota a la cartera"
              onPress={() => {
                setNotaAbierta(true);
                setNotaMensaje(null);
              }}
            >
              Nota
            </Button>
          </View>
          {notas.length === 0 ? (
            <Text style={styles.vacio}>Esta cartera no tiene notas.</Text>
          ) : (
            notas.map((nota) => (
              <View key={nota.id} style={styles.nota} testID={`nota-item-${nota.id}`}>
                <Text style={styles.notaTexto}>{nota.nota}</Text>
                <Text style={styles.notaMeta}>
                  {nota.creadoPorRol} · {formatoFecha(nota.createdAt)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <ModalConFooter
        visible={notaAbierta}
        titulo="Nueva nota"
        onCerrar={() => setNotaAbierta(false)}
        onCancelar={() => setNotaAbierta(false)}
        onConfirmar={guardarNota}
        confirmando={notaEnviando}
        confirmarTestID="nota-guardar"
      >
        <CampoModal
          testID="nota-textarea"
          label="Nota"
          placeholder="Escribe una nota para la cartera…"
          multiline
          style={styles.textarea}
          value={notaTexto}
          onChangeText={setNotaTexto}
        />
        {notaMensaje ? (
          <Text style={styles.notaMensaje}>{notaMensaje}</Text>
        ) : null}
        {notaEnviando ? <ActivityIndicator color={c.link} /> : null}
      </ModalConFooter>

      <ModalConFooter
        visible={editarAbierto}
        titulo="Editar cartera"
        onCerrar={() => setEditarAbierto(false)}
        onCancelar={() => setEditarAbierto(false)}
        onConfirmar={guardarEdicion}
        confirmando={editEnviando}
        confirmarTestID="cartera-editar-guardar"
      >
        <CampoModal
          testID="editar-cartera-nombre"
          label="Nombre"
          placeholder="Nombre de la cartera"
          value={editNombre}
          onChangeText={setEditNombre}
        />
        <CampoModal
          testID="editar-cartera-tipoInteres"
          label="Interés %"
          placeholder="Interés"
          keyboardType="decimal-pad"
          value={editTipoInteres}
          onChangeText={setEditTipoInteres}
        />
        <CampoModal
          testID="editar-cartera-numCuotas"
          label="Nº de cuotas"
          placeholder="Número de cuotas"
          keyboardType="number-pad"
          value={editNumCuotas}
          onChangeText={setEditNumCuotas}
        />
        {editMensaje ? <Text style={styles.notaMensaje}>{editMensaje}</Text> : null}
        {editEnviando ? <ActivityIndicator color={c.link} /> : null}
      </ModalConFooter>
      </SafeAreaView>
    </View>
  );
}

function crearEstilos({ c }: KitTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    sinCartera: { flex: 1, alignItems: "center", justifyContent: "center", gap: shSpace[3], padding: shSpace[6] },
    sinCarteraIcono: {
      width: 56,
      height: 56,
      borderRadius: shRadius.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surface2,
    },
    sinCarteraTexto: { ...shType.body, color: c.textMuted, textAlign: "center" },
    aviso: {
      flexDirection: "row",
      alignItems: "center",
      gap: shSpace[2],
      backgroundColor: c.statusWarningBg,
      borderBottomWidth: 1,
      borderBottomColor: c.statusWarningBorder,
      paddingHorizontal: shSpace[4],
      paddingVertical: shSpace[2],
    },
    avisoTexto: { ...shType.dense, flex: 1, color: c.text },
    scroll: { flex: 1 },
    scrollContenido: { padding: shSpace[4], gap: shSpace[3] },
    seccion: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      padding: shSpace[4],
      borderWidth: 1,
      borderColor: c.border,
      gap: shSpace[3],
    },
    seccionFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    seccionTitulo: { ...shType.block, color: c.text },
    kpis: { flexDirection: "row", gap: shSpace[2] },
    kpi: { flex: 1 },
    estadoFila: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      minHeight: shDensity.rowCompact,
    },
    estadoEtiqueta: { ...shType.label, color: c.textMuted },
    estadoValor: { ...shType.label, fontFamily: shType.hero.fontFamily, color: c.link },
    pares: { flexDirection: "row", gap: shSpace[2] },
    par: { flex: 1, alignItems: "center", gap: 1 },
    parValor: { ...shType.h1, fontFamily: shType.hero.fontFamily, fontVariant: ["tabular-nums"], color: c.textStrong },
    parEtiqueta: { ...shType.caption, fontFamily: shType.label.fontFamily, color: c.textMuted, textAlign: "center" },
    parAnterior: { ...shType.caption, color: c.textMuted },
    parDelta: { ...shType.caption, fontFamily: shType.hero.fontFamily, fontVariant: ["tabular-nums"], color: c.textMuted },
    // Subir es malo (más atrasados o sin visita); bajar es bueno. Con texto (+/−), nunca solo color.
    parDeltaSube: { color: c.statusDangerFg },
    parDeltaBaja: { color: c.statusSuccessFg },
    vacio: { ...shType.dense, color: c.textMuted },
    nota: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: shRadius.sm,
      padding: shSpace[3],
      gap: shSpace[1],
    },
    notaTexto: { ...shType.body, color: c.text },
    notaMeta: { ...shType.caption, color: c.textMuted },
    textarea: { minHeight: 96, textAlignVertical: "top" },
    notaMensaje: { ...shType.dense, color: c.statusDangerFg },
  });
}
