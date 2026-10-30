import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { File, Paths } from "expo-file-system";
import { shareAsync } from "expo-sharing";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePestanasDeEntrada, type EntradaPestanas, type SolicitudPestana } from "@shared/pestana-inicial";
import { shSpace, shType } from "@core/theme/tokens";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { AdminApiError } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { Button, Card, EmptyState, Skeleton, useToast } from "@shared/ui";
import {
  alternarAgenteDelCliente,
  cargarPlayground,
  editarCamposDelPack,
  enviarMensajePlayground,
  exportarLeadsCsv,
  listarConexionesDeConversaciones,
  listarLeads,
  reiniciarPlayground,
  type ConversationConnection,
  type FiltroLeads,
  type LeadAgentOut,
  type LeadFilter,
  type LeadRow,
  type TurnoPlayground,
} from "../api";
import { PestanaConversaciones } from "../components/PestanaConversaciones";
import { PestanaEscalaciones } from "../components/PestanaEscalaciones";
import { ClienteCard } from "../components/ClienteCard";
import { EnviarPlantillaSheet } from "../components/EnviarPlantillaSheet";
import { EtapaSheet } from "../components/EtapaSheet";
import {
  CLAVE_DE_ETAPA,
  PACK_DE_ETAPA,
  etapaDeFila,
  opcionesDeEtapa,
  type OpcionDeEtapa,
} from "../etapas";
import { FiltrosDeClientes } from "../components/FiltrosDeClientes";
import { nombreDelChat } from "../presentacion";
import type { OperacionStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<OperacionStackParamList>;
type Pestana = "conversaciones" | "escalaciones" | "leads" | "playground";
const PESTANAS: readonly Pestana[] = ["conversaciones", "escalaciones", "leads", "playground"];

function Vacio({ texto }: { texto: string }) {
  const { colores } = useTheme();
  return <Text style={[styles.vacio, { color: colores.textoSuave }]}>{texto}</Text>;
}

export function OperacionScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const puedeEscribirLeads = sesion?.role === "master" || sesion?.permissions?.leads === "write";
  const puedeEnviarPlantilla =
    sesion?.role === "master" || sesion?.role === "tester" || sesion?.tenantRole === "owner";

  // Solo las pestañas de la entrada del cajón (Conversaciones, Clientes, Agentes).
  const { pestana, setPestana, propias } = usePestanasDeEntrada<Pestana>(
    "conversaciones",
    "conversaciones",
    PESTANAS,
    pestanaInicial,
    entrada,
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clientes (leads)
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [filtrosLeads, setFiltrosLeads] = useState<FiltroLeads>({});
  const [agentesLeads, setAgentesLeads] = useState<LeadAgentOut[]>([]);
  const [filtrosDePack, setFiltrosDePack] = useState<LeadFilter[]>([]);
  const [conexiones, setConexiones] = useState<ConversationConnection[]>([]);
  const [paginaLeads, setPaginaLeads] = useState(1);
  const [hayMasLeads, setHayMasLeads] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [cargandoLeads, setCargandoLeads] = useState(false);
  const [refrescandoLeads, setRefrescandoLeads] = useState(false);
  const [botPendiente, setBotPendiente] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [etapaPara, setEtapaPara] = useState<LeadRow | null>(null);
  const [avisoDeEtapa, setAvisoDeEtapa] = useState<{
    item: LeadRow;
    etapa: OpcionDeEtapa;
    mensaje: string;
    reintentable: boolean;
  } | null>(null);
  const [plantillaPara, setPlantillaPara] = useState<{ id: string; nombre: string } | null>(null);

  // Playground
  const [turnos, setTurnos] = useState<TurnoPlayground[]>([]);
  const [mensajePlay, setMensajePlay] = useState("");

  const cargarLeads = useCallback(
    async (paginaPedida: number, filtro: FiltroLeads, acumular: boolean) => {
      setCargandoLeads(true);
      try {
        const pagina = await listarLeads(api, { ...filtro, page: paginaPedida });
        setLeads((previos) => (acumular ? [...previos, ...pagina.items] : pagina.items));
        setAgentesLeads(pagina.agents ?? []);
        setFiltrosDePack(pagina.filters ?? []);
        setPaginaLeads(pagina.page);
        setHayMasLeads(pagina.has_more);
        setTotalLeads(pagina.total);
        setError(null);
      } catch {
        setError("No pudimos cargar los clientes. Revisa tu conexión.");
      } finally {
        setCargandoLeads(false);
        setRefrescandoLeads(false);
        setCargando(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (pestana !== "leads") return;
    const temporizador = setTimeout(
      () => void cargarLeads(1, filtrosLeads, false),
      filtrosLeads.q ? 350 : 0,
    );
    return () => clearTimeout(temporizador);
  }, [pestana, filtrosLeads, cargarLeads]);

  useEffect(() => {
    if (pestana !== "leads") return;
    listarConexionesDeConversaciones(api)
      .then(setConexiones)
      .catch(() => undefined);
  }, [pestana, api]);


  const abrirConversacion = (id: string, titulo: string) =>
    navigation.navigate("ConversacionDetalle", { id, titulo });

  const cambiarPestana = (destino: Pestana) => {
    setCargando(true);
    setError(null);
    setPestana(destino);
  };

  const abrirCliente = (item: LeadRow, editar = false) => {
    const nombre = item.perfil?.nombre_visible || item.cliente || "Cliente";
    navigation.navigate("ClienteDetalle", { id: item.id, titulo: nombre, editar });
  };

  const alternarBotDe = async (item: LeadRow) => {
    const antes = item.bot_paused ?? false;
    const nombre = item.perfil?.nombre_visible || item.cliente || "el cliente";
    setBotPendiente(item.id);
    setLeads((previos) =>
      previos.map((lead) => (lead.id === item.id ? { ...lead, bot_paused: !antes } : lead)),
    );
    try {
      const pausado = await alternarAgenteDelCliente(api, item.id);
      setLeads((previos) =>
        previos.map((lead) => (lead.id === item.id ? { ...lead, bot_paused: pausado } : lead)),
      );
      toast.success(
        pausado ? `El agente quedó pausado para ${nombre}.` : `El agente vuelve a atender a ${nombre}.`,
      );
    } catch {
      setLeads((previos) =>
        previos.map((lead) => (lead.id === item.id ? { ...lead, bot_paused: antes } : lead)),
      );
      toast.error("No se pudo cambiar el agente para este cliente.");
    } finally {
      setBotPendiente(null);
    }
  };

  const opcionesEtapa = opcionesDeEtapa(filtrosDePack);

  /**
   * Cambia la etapa con actualización optimista (HU-CRM-19): la tarjeta cambia al instante y vuelve a la
   * anterior si el servidor no lo acepta. Un rechazo del servidor muestra su motivo; una falla de red
   * ofrece «Reintentar».
   */
  const cambiarEtapaDe = async (item: LeadRow, etapa: OpcionDeEtapa) => {
    const nombre = item.perfil?.nombre_visible || item.cliente || "el cliente";
    const anterior = item.extras?.[CLAVE_DE_ETAPA];
    const poner = (valor: unknown) =>
      setLeads((previos) =>
        previos.map((lead) =>
          lead.id === item.id ? { ...lead, extras: { ...lead.extras, [CLAVE_DE_ETAPA]: valor } } : lead,
        ),
      );
    setEtapaPara(null);
    setAvisoDeEtapa(null);
    poner(etapa.label);
    try {
      await editarCamposDelPack(api, item.id, PACK_DE_ETAPA, { [CLAVE_DE_ETAPA]: etapa.value });
      toast.success(`${nombre} pasó a ${etapa.label}.`);
    } catch (err) {
      poner(anterior);
      const rechazada = err instanceof AdminApiError && err.status >= 400 && err.status < 500;
      setAvisoDeEtapa({
        item: { ...item, extras: { ...item.extras, [CLAVE_DE_ETAPA]: anterior } },
        etapa,
        mensaje: rechazada
          ? err.message
          : `No se pudo cambiar la etapa de ${nombre}. Revisa tu conexión.`,
        reintentable: !rechazada,
      });
    }
  };

  const exportarClientes = async () => {
    setExportando(true);
    try {
      const { texto, nombreArchivo } = await exportarLeadsCsv(api, filtrosLeads);
      const archivo = new File(Paths.cache, nombreArchivo ?? `clientes-${Date.now()}.csv`);
      await archivo.write(texto);
      await shareAsync(archivo.uri, { mimeType: "text/csv", dialogTitle: "Compartir clientes" });
    } catch {
      toast.error("No se pudo exportar la lista de clientes.");
    } finally {
      setExportando(false);
    }
  };

  const hayFiltros = Boolean(
    filtrosLeads.q ||
      filtrosLeads.channel ||
      filtrosLeads.connection_id ||
      (filtrosLeads.filtros?.length ?? 0) > 0,
  );

  const recargarPlayground = useCallback(async () => {
    try {
      setTurnos(await cargarPlayground(api));
      setError(null);
    } catch {
      setError("No pudimos cargar el playground.");
    }
  }, [api]);

  useEffect(() => {
    if (pestana === "playground") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- el setState ocurre tras el await de recargarPlayground
      void recargarPlayground().finally(() => setCargando(false));
    }
     
  }, [pestana, recargarPlayground]);

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      {propias.length > 1 ? (
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Secciones de Operación"
          style={styles.pestanas}
        >
          {propias.map((p) => {
            const activa = pestana === p;
            const label =
              p === "conversaciones"
                ? "Conversaciones"
                : p === "escalaciones"
                  ? "Escalaciones"
                  : p === "leads"
                    ? "Clientes"
                    : "Playground";
            return (
              <Pressable
                key={p}
                testID={`pestana-${p}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                onPress={() => cambiarPestana(p)}
                style={styles.pestana}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.6}
                  style={[shType.label, { color: activa ? colores.texto : colores.textoSuave }]}
                >
                  {label}
                </Text>
                <View
                  style={[
                    styles.indicador,
                    { backgroundColor: activa ? colores.acento : "transparent" },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {pestana === "playground" ? (
        <View style={{ marginBottom: 8 }}>
          <Pressable
            testID="playground-reset"
            onPress={() => {
              void reiniciarPlayground(api)
                .then(() => setTurnos([]))
                .catch(() => setError("No se pudo reiniciar el playground."));
            }}
            style={[styles.chip, { borderColor: colores.borde, alignSelf: "flex-start" }]}
          >
            <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Reiniciar demo</Text>
          </Pressable>
        </View>
      ) : null}

      {pestana !== "conversaciones" && error ? (
        <Text testID="operacion-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      ) : null}

      {pestana === "conversaciones" ? (
        <PestanaConversaciones
          onAbrir={(chat) => abrirConversacion(chat.id, nombreDelChat(chat))}
        />
      ) : pestana === "escalaciones" ? (
        <PestanaEscalaciones
          onAbrirConversacion={abrirConversacion}
          onVerConversaciones={() => cambiarPestana("conversaciones")}
        />
      ) : cargando ? (
        <ActivityIndicator size="large" style={styles.cargando} />
      ) : pestana === "leads" ? (
        <View style={styles.leads}>
          <FiltrosDeClientes
            valor={filtrosLeads}
            conexiones={conexiones}
            filtrosDePack={filtrosDePack}
            onChange={setFiltrosLeads}
          />
          {error ? (
            <Text testID="leads-error" style={[styles.errorLeads, { color: colores.peligro }]}>
              {error}
            </Text>
          ) : null}
          {avisoDeEtapa ? (
            <View
              testID="etapa-aviso"
              accessibilityRole="alert"
              style={[styles.avisoEtapa, { borderColor: colores.peligro, backgroundColor: colores.tarjeta }]}
            >
              <Text style={[styles.errorLeads, styles.textoAviso, { color: colores.peligro }]}>
                {avisoDeEtapa.mensaje}
              </Text>
              {avisoDeEtapa.reintentable ? (
                <Button
                  testID="etapa-reintentar"
                  variant="secondary"
                  size="sm"
                  onPress={() => void cambiarEtapaDe(avisoDeEtapa.item, avisoDeEtapa.etapa)}
                >
                  Reintentar
                </Button>
              ) : null}
              <Button
                testID="etapa-aviso-cerrar"
                variant="ghost"
                size="sm"
                onPress={() => setAvisoDeEtapa(null)}
              >
                Cerrar
              </Button>
            </View>
          ) : null}
          {cargandoLeads && leads.length === 0 ? (
            <EsqueletosDeClientes />
          ) : (
            <FlatList
              testID="lista-leads"
              data={leads}
              keyExtractor={(lead) => lead.id}
              contentContainerStyle={styles.listaLeads}
              refreshControl={
                <RefreshControl
                  refreshing={refrescandoLeads}
                  onRefresh={() => {
                    setRefrescandoLeads(true);
                    void cargarLeads(1, filtrosLeads, false);
                  }}
                  colors={[colores.acento]}
                  tintColor={colores.acento}
                />
              }
              ListHeaderComponent={
                <View style={styles.cabeceraLeads}>
                  <Text style={[styles.totalLeads, { color: colores.textoSuave }]}>
                    {totalLeads} {totalLeads === 1 ? "cliente" : "clientes"}
                  </Text>
                  <Button
                    testID="leads-exportar"
                    variant="secondary"
                    size="sm"
                    iconLeft="file-download"
                    loading={exportando}
                    onPress={() => void exportarClientes()}
                  >
                    CSV
                  </Button>
                </View>
              }
              ListEmptyComponent={
                <EmptyState
                  testID="leads-vacio"
                  icon="people-outline"
                  title="Sin clientes todavía"
                  description={
                    hayFiltros
                      ? "Ningún cliente coincide con los filtros. Prueba con otros."
                      : "Cuando el agente atienda al primer cliente, aparecerá aquí."
                  }
                  action={{
                    label: hayFiltros ? "Limpiar filtros" : "Actualizar",
                    onPress: () => {
                      if (hayFiltros) setFiltrosLeads({});
                      else void cargarLeads(1, filtrosLeads, false);
                    },
                  }}
                />
              }
              renderItem={({ item }) => (
                <ClienteCard
                  item={item}
                  agentes={agentesLeads}
                  puedeEscribir={puedeEscribirLeads}
                  puedeEnviarPlantilla={puedeEnviarPlantilla}
                  botPendiente={botPendiente === item.id}
                  onAbrir={() => abrirCliente(item)}
                  onEditar={() => abrirCliente(item, true)}
                  onAlternarBot={() => void alternarBotDe(item)}
                  opcionesEtapa={opcionesEtapa}
                  onCambiarEtapa={() => setEtapaPara(item)}
                  onEnviarPlantilla={() =>
                    setPlantillaPara({
                      id: item.id,
                      nombre: item.perfil?.nombre_visible || item.cliente || "Cliente",
                    })
                  }
                />
              )}
              ListFooterComponent={
                hayMasLeads ? (
                  <ActivityIndicator style={styles.pieLista} color={colores.acento} />
                ) : null
              }
              onEndReachedThreshold={0.4}
              onEndReached={() => {
                if (hayMasLeads && !cargandoLeads) {
                  void cargarLeads(paginaLeads + 1, filtrosLeads, true);
                }
              }}
            />
          )}
          <EtapaSheet
            visible={Boolean(etapaPara)}
            onClose={() => setEtapaPara(null)}
            nombre={etapaPara?.perfil?.nombre_visible || etapaPara?.cliente || "el cliente"}
            actual={etapaPara ? etapaDeFila(etapaPara, opcionesEtapa)?.value : undefined}
            opciones={opcionesEtapa}
            onElegir={(etapa) => etapaPara && void cambiarEtapaDe(etapaPara, etapa)}
          />
          <EnviarPlantillaSheet
            visible={Boolean(plantillaPara)}
            onClose={() => setPlantillaPara(null)}
            leadId={plantillaPara?.id ?? ""}
            nombre={plantillaPara?.nombre ?? ""}
          />
        </View>
      ) : (
        <>
          <FlatList
            testID="lista-playground"
            data={turnos}
            keyExtractor={(_, i) => `turno-${i}`}
            ListEmptyComponent={<Vacio texto="Conversación de demostración. Escribe abajo para probar el asistente." />}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.fila,
                  {
                    borderColor: item.escalated ? colores.peligro : colores.borde,
                    backgroundColor: colores.tarjeta,
                  },
                ]}
              >
                <Text style={{ color: colores.texto }}>{item.text}</Text>
              </View>
            )}
          />
          <TextInput
            testID="playground-campo"
            value={mensajePlay}
            onChangeText={setMensajePlay}
            placeholder="Escribe un mensaje de prueba…"
            placeholderTextColor={colores.textoSuave}
            onSubmitEditing={() => {
              if (!mensajePlay.trim()) {
                return;
              }
              void enviarMensajePlayground(api, mensajePlay.trim())
                .then(() => {
                  setMensajePlay("");
                  return recargarPlayground();
                })
                .catch(() => setError("No se pudo enviar el mensaje."));
            }}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
        </>
      )}
    </View>
  );
}

function EsqueletosDeClientes() {
  return (
    <View style={styles.esqueletos} accessibilityState={{ busy: true }}>
      {[0, 1, 2].map((i) => (
        <Card key={i} testID={`lead-esqueleto-${i}`}>
          <View style={styles.esqueletoFila}>
            <Skeleton shape="circle" height={40} />
            <View style={styles.esqueletoTextos}>
              <Skeleton width="60%" />
              <Skeleton width="40%" />
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 12 },
  pestanas: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: shSpace[4],
    marginBottom: shSpace[2],
  },
  pestana: { minHeight: 44, paddingVertical: shSpace[2], paddingHorizontal: shSpace[1], gap: 3 },
  indicador: { height: 2, width: 16, borderRadius: 1 },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  chips: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  cargando: { marginTop: 30 },
  vacio: { textAlign: "center", marginTop: 24, fontSize: 14 },
  error: { fontSize: 13, marginBottom: 8 },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  filaTexto: { flex: 1, marginRight: 8 },
  filaTitulo: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  leads: { flex: 1, gap: 6 },
  errorLeads: { fontSize: 13 },
  avisoEtapa: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginBottom: 8 },
  textoAviso: { fontSize: 14 },
  listaLeads: { gap: 10, paddingBottom: 24 },
  cabeceraLeads: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  totalLeads: { fontSize: 13 },
  pieLista: { marginVertical: 16 },
  esqueletos: { gap: 10 },
  esqueletoFila: { flexDirection: "row", alignItems: "center", gap: 12 },
  esqueletoTextos: { flex: 1, gap: 8 },
});
