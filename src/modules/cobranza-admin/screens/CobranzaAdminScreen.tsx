import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePestanaInicial, type EntradaPestanas, type SolicitudPestana } from "@shared/pestana-inicial";
import { gruposDeMenu, pestanasDeEntrada } from "@shared/menu-panel";
import { useTheme } from "@core/theme/theme-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { puedeVerSeccion } from "@core/permisos";
import { Button, EmptyState, TextField, useToast } from "@shared/ui";
import {
  cargarAuditoria,
  cargarCarteras,
  cargarClientes as cargarClientesApi,
  eliminarCliente as eliminarClienteApi,
  cargarMonitoreo,
  cargarPagos,
  cargarPromesas,
  cargarReglas,
  cargarReportes,
  cargarResumen,
  cambiarEstadoPromesa,
  guardarReglas,
  type AuditoriaCobranza,
  type ClientRow,
  type Kpi,
  type Monitoring,
  type PagoAdmin,
  type PortfolioRow,
  type PromesaAdmin,
  type Reglas,
  type Reportes,
} from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";
import { ClienteCobranzaCard } from "../components/ClienteCard";
import { ClienteFormSheet } from "../components/ClienteFormSheet";
import { TarjetaDatosDePrueba } from "../../datos-prueba";
import { GestoresTab } from "./GestoresTab";

type Nav = NativeStackNavigationProp<CobranzaAdminStackParamList>;
type Pestana = "resumen" | "carteras" | "clientes" | "pagos" | "promesas" | "reportes" | "monitoreo" | "reglas" | "auditoria" | "gestores";

const CLAVES: readonly Pestana[] = [
  "resumen", "carteras", "clientes", "pagos", "promesas",
  "reportes", "monitoreo", "reglas", "auditoria", "gestores",
];

interface Seccion {
  clave: Pestana;
  label: string;
  area: string;
  oculta: boolean;
}

/**
 * Secciones y áreas salen del menú del panel (`COBRANZA`, HU-UX-12): la entrada
 * que manda el shell o, sin ella, la del propio usuario. Así la pantalla y el
 * cajón nunca se desfasan.
 */
function seccionesDe(entrada: EntradaPestanas): Seccion[] {
  return entrada.pestanas.flatMap((p) =>
    p.tab === "cobranza" && (CLAVES as readonly string[]).includes(p.pestana)
      ? [{ clave: p.pestana as Pestana, label: p.label, area: p.sub ?? p.label, oculta: Boolean(p.oculta) }]
      : [],
  );
}

export function CobranzaAdminScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const toast = useToast();
  const navigation = useNavigation<Nav>();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};
  const puedeEscribirClientes = esMaster || permisos["pack_cobranza:clientes"] === "write";

  const permisosSesion = sesion?.permissions;
  const secciones = useMemo(() => {
    if (entrada) return seccionesDe(entrada);
    const propia = gruposDeMenu(permisosSesion ?? {}, esMaster)
      .flatMap((g) => g.entradas)
      .find((e) => e.id === "cobranza");
    return propia ? seccionesDe(pestanasDeEntrada(propia)) : [];
  }, [entrada, permisosSesion, esMaster]);
  const validas = useMemo(() => secciones.map((s) => s.clave), [secciones]);
  const [elegida, setPestana] = usePestanaInicial<Pestana>(
    validas.includes("resumen") ? "resumen" : (validas[0] ?? "resumen"),
    validas,
    pestanaInicial,
  );
  const pestana = validas.includes(elegida) ? elegida : (validas[0] ?? elegida);
  const areas = useMemo(() => [...new Set(secciones.map((s) => s.area))], [secciones]);
  const areaActual = secciones.find((s) => s.clave === pestana)?.area;
  // Fila 2: las secciones del área; la oculta (Clientes) solo cuando está en pantalla.
  const seccionesDelArea = secciones.filter((s) => s.area === areaActual && (!s.oculta || s.clave === pestana));
  const abrirArea = (area: string) => {
    const primera = secciones.find((s) => s.area === area && !s.oculta) ?? secciones.find((s) => s.area === area);
    if (primera) setPestana(primera.clave);
  };
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [carteras, setCarteras] = useState<PortfolioRow[]>([]);
  const [clientes, setClientes] = useState<ClientRow[]>([]);
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [promesas, setPromesas] = useState<PromesaAdmin[]>([]);
  const [reportes, setReportes] = useState<Reportes | null>(null);
  const [monitoreo, setMonitoreo] = useState<Monitoring | null>(null);
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaCobranza | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [carteraFiltro, setCarteraFiltro] = useState<string | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [refrescandoClientes, setRefrescandoClientes] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<ClientRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conSeccion = (seccion: string) => esMaster || puedeVerSeccion(permisos, seccion, false);

  const cargar = useCallback(async () => {
    try {
      const pendientes: Promise<unknown>[] = [];
      if (conSeccion("pack_cobranza:resumen")) {
        pendientes.push(cargarResumen(api).then((r) => setKpis(r.kpis)));
      }
      if (conSeccion("pack_cobranza:carteras")) {
        pendientes.push(cargarCarteras(api).then((lista) => setCarteras(Array.isArray(lista) ? lista : [])));
      }
      if (conSeccion("pack_cobranza:cobros")) {
        pendientes.push(cargarPagos(api).then(setPagos));
      }
      if (conSeccion("pack_cobranza:promesas")) {
        pendientes.push(cargarPromesas(api).then(setPromesas));
      }
      if (conSeccion("pack_cobranza:reportes")) {
        pendientes.push(cargarReportes(api).then(setReportes));
      }
      if (conSeccion("pack_cobranza:monitoreo")) {
        pendientes.push(cargarMonitoreo(api).then(setMonitoreo));
      }
      if (conSeccion("pack_cobranza:reglas")) {
        pendientes.push(cargarReglas(api).then(setReglas));
      }
      if (conSeccion("pack_cobranza:auditoria")) {
        pendientes.push(cargarAuditoria(api).then(setAuditoria));
      }
      await Promise.all(pendientes);
      setError(null);
    } catch {
      setError("No pudimos cargar la cobranza. Revisa tu conexión.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- conSeccion deriva de la sesión y permisos
  }, [api, esMaster, permisos]);

  const cargarListaDeClientes = useCallback(
    async (texto: string, carteraId: string | undefined, refresco = false) => {
      if (!conSeccion("pack_cobranza:clientes")) return;
      if (refresco) setRefrescandoClientes(true);
      else setCargandoClientes(true);
      try {
        setClientes(await cargarClientesApi(api, texto || undefined, carteraId));
        setError(null);
      } catch {
        setError("No pudimos cargar los clientes. Revisa tu conexión.");
      } finally {
        setCargandoClientes(false);
        setRefrescandoClientes(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- conSeccion deriva de sesión y permisos
    [api, esMaster, permisos],
  );

  useEffect(() => {
    if (pestana !== "clientes") return;
    const temporizador = setTimeout(
      () => void cargarListaDeClientes(busqueda, carteraFiltro),
      busqueda ? 350 : 0,
    );
    return () => clearTimeout(temporizador);
  }, [pestana, busqueda, carteraFiltro, cargarListaDeClientes]);

  useEffect(() => {
    const temporizador = setTimeout(
       
      () => void cargar().finally(() => setCargando(false)),
      0,
    );
    return () => clearTimeout(temporizador);
  }, [cargar]);

  const cambiarPromesa = (p: PromesaAdmin) => {
    const estados = ["cumplida", "incumplida", "pendiente"].filter((e) => e !== p.estado);
    Alert.alert(`Promesa de ${p.cliente}`, "¿A qué estado la movemos?", [
      ...estados.map((estado) => ({
        text: estado,
        onPress: () => {
          void cambiarEstadoPromesa(api, p.id, estado).then(cargar).catch(() => setError("No se pudo cambiar la promesa."));
        },
      })),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  const abrirCliente = (c: ClientRow) =>
    navigation.navigate("ClienteDetalle", {
      id: c.id,
      titulo: `${c.nombre} ${c.apellido ?? ""}`.trim() || "Cliente",
      carteraId: c.cartera_id,
      carteraTitulo: c.cartera,
    });

  const abrirCartera = (c: PortfolioRow) =>
    navigation.navigate("CarteraDetalle", { id: c.id, titulo: c.nombre });

  const abrirNuevoCliente = () => {
    if (carteras.length === 0) {
      setPestana("carteras");
      toast.error("Crea una cartera antes de registrar clientes.");
      return;
    }
    setClienteEditando(null);
    setFormAbierto(true);
  };

  const abrirEditarCliente = (c: ClientRow) => {
    setClienteEditando(c);
    setFormAbierto(true);
  };

  const confirmarEliminarCliente = (c: ClientRow) => {
    const nombre = `${c.nombre} ${c.apellido ?? ""}`.trim() || "este cliente";
    Alert.alert("Eliminar cliente", `¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarClienteApi(api, c.id)
            .then(() => {
              toast.success(`${nombre} quedó eliminado.`);
              return cargarListaDeClientes(busqueda, carteraFiltro);
            })
            .catch(() => setError("No se pudo eliminar el cliente."));
        },
      },
    ]);
  };

  const alGuardarCliente = () => {
    toast.success(clienteEditando ? "Cliente actualizado." : "Cliente creado.");
    void cargarListaDeClientes(busqueda, carteraFiltro);
  };

  const guardarReglasAhora = () => {
    if (!reglas) {
      return;
    }
    void guardarReglas(api, reglas)
      .then(() => Alert.alert("Listo", "Reglas guardadas."))
      .catch(() => setError("No se pudieron guardar las reglas."));
  };

  const setRegla = (campo: keyof Reglas, valor: string) => {
    setReglas((previas) => (previas ? { ...previas, [campo]: Number(valor) } : previas));
  };

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <ScrollView
        testID="cobranza-pestanas"
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pestanasScroll}
      >
        {areas.map((area) => {
          const activa = area === areaActual;
          return (
            <Pressable
              key={area}
              testID={`cobranza-area-${area.toLowerCase()}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => abrirArea(area)}
              style={[styles.pestana, activa && { borderBottomColor: colores.acento, borderBottomWidth: 2 }]}
            >
              <Text style={{ color: activa ? colores.texto : colores.textoSuave, fontSize: 12, fontWeight: "700" }}>
                {area}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {seccionesDelArea.length > 1 ? (
        <ScrollView
          testID="cobranza-secciones"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pestanasScroll}
        >
          {seccionesDelArea.map((p) => {
            const activa = pestana === p.clave;
            return (
              <Pressable
                key={p.clave}
                testID={`cobranza-${p.clave}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                onPress={() => setPestana(p.clave)}
                style={[
                  styles.seccionChip,
                  { borderColor: activa ? colores.acento : colores.borde },
                  activa && { backgroundColor: colores.tarjeta },
                ]}
              >
                <Text style={{ color: activa ? colores.texto : colores.textoSuave, fontSize: 11, fontWeight: "600" }}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {error ? <Text testID="cobranza-error" style={{ color: colores.peligro, marginBottom: 8 }}>{error}</Text> : null}

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "resumen" ? (
        <View style={{ gap: 12 }}>
          <TarjetaDatosDePrueba api={api} modulo="cobranza" testID="datos-prueba-cobranza" />
          <View style={styles.grid}>
            {kpis.map((k) => (
              <View key={k.label} style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
                <Text style={[styles.kpiValor, { color: colores.texto }]}>{k.value}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{k.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : pestana === "carteras" ? (
        <FlatList
          testID="cobranza-lista-carteras"
          data={carteras}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            validas.includes("clientes") ? (
              <Pressable
                testID="cobranza-buscar-cliente"
                accessibilityRole="button"
                onPress={() => setPestana("clientes")}
                style={[styles.campo, styles.buscarCliente, { borderColor: colores.borde }]}
              >
                <Text style={{ color: colores.textoSuave, fontSize: 14 }}>Buscar cliente</Text>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={<Text style={styles.vacio}>Sin carteras.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => abrirCartera(item)} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.nombre}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.num_cuotas} cuotas · {item.moneda} · {item.gestor ?? "sin gestor"}
                </Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 11 }}>{item.estatus} ›</Text>
            </Pressable>
          )}
        />
      ) : pestana === "clientes" ? (
        <>
          <View style={styles.busquedaFila}>
            <TextField
              testID="cobranza-busqueda"
              accessibilityLabel="Buscar clientes por nombre o documento"
              placeholder="Buscar por nombre o documento"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.busqueda}
            />
            {puedeEscribirClientes ? (
              <Button testID="cobranza-nuevo-cliente" size="sm" iconLeft="add" onPress={abrirNuevoCliente}>
                Nuevo
              </Button>
            ) : null}
          </View>

          {carteras.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtrosCartera}
            >
              <Pressable
                testID="cobranza-filtro-cartera-todas"
                accessibilityRole="radio"
                accessibilityLabel="Todas las carteras"
                accessibilityState={{ selected: !carteraFiltro }}
                onPress={() => setCarteraFiltro(undefined)}
                style={[
                  styles.chipFiltro,
                  {
                    borderColor: !carteraFiltro ? colores.acento : colores.borde,
                    backgroundColor: !carteraFiltro ? colores.tarjeta : "transparent",
                  },
                ]}
              >
                <Text style={{ color: !carteraFiltro ? colores.texto : colores.textoSuave, fontSize: 12 }}>
                  Todas
                </Text>
              </Pressable>
              {carteras.map((cartera) => {
                const activa = carteraFiltro === cartera.id;
                return (
                  <Pressable
                    key={cartera.id}
                    testID={`cobranza-filtro-cartera-${cartera.id}`}
                    accessibilityRole="radio"
                    accessibilityLabel={cartera.nombre}
                    accessibilityState={{ selected: activa }}
                    onPress={() => setCarteraFiltro(cartera.id)}
                    style={[
                      styles.chipFiltro,
                      {
                        borderColor: activa ? colores.acento : colores.borde,
                        backgroundColor: activa ? colores.tarjeta : "transparent",
                      },
                    ]}
                  >
                    <Text style={{ color: activa ? colores.texto : colores.textoSuave, fontSize: 12 }}>
                      {cartera.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {cargandoClientes && clientes.length === 0 ? (
            <ActivityIndicator size="large" style={{ marginTop: 30 }} />
          ) : (
            <FlatList
              testID="cobranza-lista-clientes"
              data={clientes}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.listaClientes}
              refreshControl={
                <RefreshControl
                  refreshing={refrescandoClientes}
                  onRefresh={() => void cargarListaDeClientes(busqueda, carteraFiltro, true)}
                  colors={[colores.acento]}
                  tintColor={colores.acento}
                />
              }
              ListHeaderComponent={
                <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 6 }}>
                  {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
                </Text>
              }
              ListEmptyComponent={
                <EmptyState
                  testID="cobranza-clientes-vacio"
                  icon="people-outline"
                  title="Sin clientes"
                  description={
                    busqueda || carteraFiltro
                      ? "Ningún cliente coincide con la búsqueda o la cartera."
                      : "Registra el primer cliente de esta cartera."
                  }
                  action={{
                    label: busqueda || carteraFiltro ? "Limpiar filtros" : puedeEscribirClientes ? "Nuevo cliente" : "Actualizar",
                    onPress: () => {
                      if (busqueda || carteraFiltro) {
                        setBusqueda("");
                        setCarteraFiltro(undefined);
                      } else if (puedeEscribirClientes) {
                        abrirNuevoCliente();
                      } else {
                        void cargarListaDeClientes(busqueda, carteraFiltro);
                      }
                    },
                  }}
                />
              }
              renderItem={({ item }) => (
                <ClienteCobranzaCard
                  item={item}
                  puedeEscribir={puedeEscribirClientes}
                  onAbrir={() => abrirCliente(item)}
                  onEditar={() => abrirEditarCliente(item)}
                  onEliminar={() => confirmarEliminarCliente(item)}
                />
              )}
            />
          )}
        </>
      ) : pestana === "pagos" ? (
        <FlatList testID="cobranza-lista-pagos" data={pagos} keyExtractor={(p) => p.id}
          ListEmptyComponent={<Text style={styles.vacio}>Sin pagos recientes.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.cliente}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.fecha_hora} · {item.metodo_pago ?? "—"}</Text>
              </View>
              <Text style={{ color: colores.texto }}>${item.valor}</Text>
            </View>
          )}
        />
      ) : pestana === "promesas" ? (
        <FlatList testID="cobranza-lista-promesas" data={promesas} keyExtractor={(p) => p.id}
          ListEmptyComponent={<Text style={styles.vacio}>Sin promesas.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => cambiarPromesa(item)} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.cliente}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.fecha_prometida ?? "—"} · ${item.valor_prometido}</Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 11 }}>{item.estado} ›</Text>
            </Pressable>
          )}
        />
      ) : pestana === "reportes" ? (
        <FlatList testID="cobranza-lista-reportes" data={reportes?.filas ?? []} keyExtractor={(f) => f.cartera}
          ListEmptyComponent={<Text style={styles.vacio}>Sin reportes.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.cartera}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.clientes} clientes · {item.prestamos} préstamos · saldo ${item.saldo}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: colores.texto, fontSize: 13 }}>${item.cobrado}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 11 }}>caja ${item.caja}</Text>
              </View>
            </View>
          )}
        />
      ) : pestana === "monitoreo" ? (
        <ScrollView>
          <View style={styles.grid}>
            <KpiMini titulo="Conversaciones" valor={String(monitoreo?.conversaciones ?? 0)} />
            <KpiMini titulo="Escalaciones" valor={String(monitoreo?.escalaciones ?? 0)} />
            <KpiMini titulo="Promesas pendientes" valor={String(monitoreo?.promesas_pendientes ?? 0)} />
            <KpiMini titulo="Cumplidas" valor={String(monitoreo?.promesas_cumplidas ?? 0)} />
            <KpiMini titulo="Incumplidas" valor={String(monitoreo?.promesas_incumplidas ?? 0)} />
          </View>
          {validas.includes("promesas") ? (
            <Pressable
              testID="monitoreo-ver-promesas"
              accessibilityRole="link"
              onPress={() => setPestana("promesas")}
              style={styles.enlace}
            >
              <Text style={{ color: colores.acento, fontSize: 13, fontWeight: "600" }}>Ver promesas en Actividad ›</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : pestana === "reglas" ? (
        <ScrollView testID="cobranza-reglas">
          <CampoRegla etiqueta="Máx. días de prórroga" valor={reglas?.max_dias_prorroga} onChange={(v) => setRegla("max_dias_prorroga", v)} />
          <CampoRegla etiqueta="Mín. % de abono" valor={reglas?.min_abono_pct} onChange={(v) => setRegla("min_abono_pct", v)} />
          <CampoRegla etiqueta="Máx. reprogramaciones" valor={reglas?.max_reprogramaciones} onChange={(v) => setRegla("max_reprogramaciones", v)} />
          <CampoRegla etiqueta="Umbral saldo autónomo" valor={reglas?.umbral_saldo_autonomo} onChange={(v) => setRegla("umbral_saldo_autonomo", v)} />
          <Pressable testID="reglas-guardar" onPress={guardarReglasAhora} style={[styles.botonGuardar, { backgroundColor: colores.primario }]}>
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Guardar reglas</Text>
          </Pressable>
        </ScrollView>
      ) : pestana === "gestores" ? (
        <GestoresTab api={api} />
      ) : (
        <FlatList testID="cobranza-lista-auditoria" data={auditoria?.filas ?? []} keyExtractor={(f, i) => `${f.fecha}-${f.entidad_id ?? ""}-${i}`}
          ListEmptyComponent={<Text style={styles.vacio}>Sin movimientos auditados.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.entidad} · {item.operacion}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.fecha} · {item.actor ?? "—"}</Text>
              </View>
            </View>
          )}
        />
      )}

      <ClienteFormSheet
        visible={formAbierto}
        onClose={() => setFormAbierto(false)}
        carteras={carteras}
        cliente={clienteEditando}
        carteraInicial={carteraFiltro}
        onGuardado={alGuardarCliente}
      />
    </View>
  );
}

function KpiMini({ titulo, valor }: { titulo: string; valor: string }) {
  const { colores } = useTheme();
  return (
    <View style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
      <Text style={[styles.kpiValor, { color: colores.texto }]}>{valor}</Text>
      <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{titulo}</Text>
    </View>
  );
}

function CampoRegla({ etiqueta, valor, onChange }: { etiqueta: string; valor: number | undefined; onChange(v: string): void }) {
  const { colores } = useTheme();
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: colores.texto, fontSize: 13, marginBottom: 4 }}>{etiqueta}</Text>
      <TextInput
        testID={`regla-${etiqueta}`}
        value={valor != null ? String(valor) : ""}
        onChangeText={onChange}
        keyboardType="numeric"
        style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 10 },
  // flexGrow 0: un ScrollView horizontal en columna crece y deja un hueco bajo las pestañas.
  pestanasScroll: { flexGrow: 0, marginBottom: 10 },
  pestana: { paddingVertical: 10, paddingHorizontal: 10, alignItems: "center" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, marginBottom: 6 },
  fila: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  kpi: { borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  kpiValor: { fontSize: 20, fontWeight: "700" },
  vacio: { color: "#8695B0", textAlign: "center", marginTop: 20 },
  seccionChip: { borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8 },
  buscarCliente: { justifyContent: "center", minHeight: 44 },
  enlace: { paddingVertical: 12, minHeight: 44, justifyContent: "center" },
  botonGuardar: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  busquedaFila: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  busqueda: { flex: 1 },
  filtrosCartera: { flexDirection: "row", gap: 8, paddingBottom: 8 },
  chipFiltro: {
    minHeight: 40,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  listaClientes: { gap: 10, paddingBottom: 24 },
});
