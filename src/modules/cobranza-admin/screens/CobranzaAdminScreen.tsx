import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePestanaInicial, type SolicitudPestana } from "@shared/pestana-inicial";
import { useTheme } from "@core/theme/theme-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { puedeVerSeccion } from "@core/permisos";
import {
  cargarAlertas,
  cargarAuditoria,
  cargarCarteras,
  cargarClientes,
  cargarDispositivos,
  cargarMonitoreo,
  cargarPagos,
  cargarPromesas,
  cargarReglas,
  cargarReportes,
  cargarResumen,
  cambiarEstadoDispositivo,
  cambiarEstadoPromesa,
  guardarReglas,
  type AccessAttempt,
  type Alertas,
  type AuditoriaCobranza,
  type ClientRow,
  type DeviceRow,
  type Dispositivos,
  type Kpi,
  type Monitoring,
  type PagoAdmin,
  type PortfolioRow,
  type PromesaAdmin,
  type Reglas,
  type Reportes,
} from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";
import { GestoresTab } from "./GestoresTab";

type Nav = NativeStackNavigationProp<CobranzaAdminStackParamList>;
type Pestana = "resumen" | "carteras" | "clientes" | "pagos" | "promesas" | "dispositivos" | "reportes" | "monitoreo" | "reglas" | "alertas" | "auditoria" | "gestores";

const PESTANAS: { clave: Pestana; label: string; seccion: string }[] = [
  { clave: "resumen", label: "Resumen", seccion: "pack_cobranza:resumen" },
  { clave: "carteras", label: "Carteras", seccion: "pack_cobranza:carteras" },
  { clave: "clientes", label: "Clientes", seccion: "pack_cobranza:clientes" },
  { clave: "pagos", label: "Pagos", seccion: "pack_cobranza:cobros" },
  { clave: "promesas", label: "Promesas", seccion: "pack_cobranza:promesas" },
  { clave: "dispositivos", label: "Dispositivos", seccion: "pack_cobranza:dispositivos" },
  { clave: "reportes", label: "Reportes", seccion: "pack_cobranza:reportes" },
  { clave: "monitoreo", label: "Monitoreo", seccion: "pack_cobranza:monitoreo" },
  { clave: "reglas", label: "Reglas", seccion: "pack_cobranza:reglas" },
  { clave: "alertas", label: "Alertas", seccion: "pack_cobranza:alertas" },
  { clave: "auditoria", label: "Auditoría", seccion: "pack_cobranza:auditoria" },
  { clave: "gestores", label: "Gestores", seccion: "pack_cobranza:gestores" },
];

export function CobranzaAdminScreen({ pestanaInicial }: { pestanaInicial?: SolicitudPestana } = {}) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const navigation = useNavigation<Nav>();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const permisos = sesion?.permissions ?? {};

  const visibles = PESTANAS.filter((p) => esMaster || puedeVerSeccion(permisos, p.seccion, false));
  const [pestana, setPestana] = usePestanaInicial<Pestana>(
    "resumen",
    visibles.map((p) => p.clave),
    pestanaInicial,
  );
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [carteras, setCarteras] = useState<PortfolioRow[]>([]);
  const [clientes, setClientes] = useState<ClientRow[]>([]);
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [promesas, setPromesas] = useState<PromesaAdmin[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivos | null>(null);
  const [reportes, setReportes] = useState<Reportes | null>(null);
  const [monitoreo, setMonitoreo] = useState<Monitoring | null>(null);
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaCobranza | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const conSeccion = (seccion: string) => esMaster || puedeVerSeccion(permisos, seccion, false);

  const cargar = useCallback(async () => {
    try {
      const pendientes: Promise<unknown>[] = [];
      if (conSeccion("pack_cobranza:resumen")) {
        pendientes.push(cargarResumen(api).then((r) => setKpis(r.kpis)));
      }
      if (conSeccion("pack_cobranza:carteras")) {
        pendientes.push(cargarCarteras(api).then(setCarteras));
      }
      if (conSeccion("pack_cobranza:clientes")) {
        pendientes.push(cargarClientes(api, busqueda || undefined).then(setClientes));
      }
      if (conSeccion("pack_cobranza:cobros")) {
        pendientes.push(cargarPagos(api).then(setPagos));
      }
      if (conSeccion("pack_cobranza:promesas")) {
        pendientes.push(cargarPromesas(api).then(setPromesas));
      }
      if (conSeccion("pack_cobranza:dispositivos")) {
        pendientes.push(cargarDispositivos(api).then(setDispositivos));
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
      if (conSeccion("pack_cobranza:alertas")) {
        pendientes.push(cargarAlertas(api).then(setAlertas));
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
  }, [api, busqueda, esMaster, permisos]);

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

  const cambiarDispositivo = (d: DeviceRow) => {
    const aprobar = d.estado !== "activo";
    Alert.alert(`${aprobar ? "Aprobar" : "Bloquear"} dispositivo`, `${d.gestor ?? d.codigo ?? "Dispositivo"} ${aprobar ? "podrá operar en campo." : "dejará de operar."}`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: aprobar ? "Aprobar" : "Bloquear",
        style: aprobar ? "default" : "destructive",
        onPress: () => {
          void cambiarEstadoDispositivo(api, d.id, aprobar ? "activo" : "bloqueado").then(cargar).catch(() => setError("No se pudo cambiar el dispositivo."));
        },
      },
    ]);
  };

  const abrirCliente = (c: ClientRow) =>
    navigation.navigate("ClienteDetalle", { id: c.id, titulo: `${c.nombre} ${c.apellido ?? ""}`.trim() || "Cliente" });

  const abrirCartera = (c: PortfolioRow) =>
    navigation.navigate("CarteraDetalle", { id: c.id, titulo: c.nombre });

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
        {visibles.map((p) => (
          <Pressable
            key={p.clave}
            testID={`cobranza-${p.clave}`}
            onPress={() => setPestana(p.clave)}
            style={[styles.pestana, pestana === p.clave && { borderBottomColor: colores.acento, borderBottomWidth: 2 }]}
          >
            <Text style={{ color: pestana === p.clave ? colores.texto : colores.textoSuave, fontSize: 11, fontWeight: "600" }}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? <Text testID="cobranza-error" style={{ color: colores.peligro, marginBottom: 8 }}>{error}</Text> : null}

      {cargando ? (
        <ActivityIndicator size="large" style={{ marginTop: 30 }} />
      ) : pestana === "resumen" ? (
        <View style={styles.grid}>
          {kpis.map((k) => (
            <View key={k.label} style={[styles.kpi, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={[styles.kpiValor, { color: colores.texto }]}>{k.value}</Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{k.label}</Text>
            </View>
          ))}
        </View>
      ) : pestana === "carteras" ? (
        <FlatList
          testID="cobranza-lista-carteras"
          data={carteras}
          keyExtractor={(c) => c.id}
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
          <TextInput testID="cobranza-busqueda" value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre o documento"
            placeholderTextColor={colores.textoSuave} style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
          <FlatList testID="cobranza-lista-clientes" data={clientes} keyExtractor={(c) => c.id}
            ListEmptyComponent={<Text style={styles.vacio}>Sin clientes.</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => abrirCliente(item)} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.nombre} {item.apellido ?? ""}</Text>
                  <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.numero_documento ?? item.telefono ?? "—"} · {item.cartera ?? "sin cartera"}</Text>
                </View>
                <Text style={{ color: colores.acento, fontSize: 11 }}>{item.color_riesgo} ›</Text>
              </Pressable>
            )}
          />
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
      ) : pestana === "dispositivos" ? (
        <FlatList testID="cobranza-lista-dispositivos" data={dispositivos?.dispositivos ?? []} keyExtractor={(d) => d.id}
          ListHeaderComponent={(dispositivos?.pendientes ?? 0) > 0 ? <Text style={{ color: colores.peligro, fontSize: 13, marginBottom: 8 }}>{dispositivos?.pendientes} pendiente(s) de aprobación</Text> : null}
          ListEmptyComponent={<Text style={styles.vacio}>Sin dispositivos.</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => cambiarDispositivo(item)} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.gestor ?? item.codigo ?? "Dispositivo"}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.imei ?? "sin IMEI"} · {item.whatsapp ?? "—"}</Text>
              </View>
              <Text style={{ color: item.estado === "activo" ? colores.acento : colores.peligro, fontSize: 11 }}>{item.estado}</Text>
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
          <Text style={[styles.seccion, { color: colores.texto }]}>Últimas promesas</Text>
          {(monitoreo?.ultimas_promesas ?? []).map((p) => (
            <View key={p.id} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <Text style={{ color: colores.texto, flex: 1 }}>{p.cliente}</Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{p.estado}</Text>
            </View>
          ))}
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
      ) : pestana === "alertas" ? (
        <FlatList testID="cobranza-lista-alertas" data={alertas?.items ?? []} keyExtractor={(a: AccessAttempt, i) => `${a.fecha}-${a.imei}-${i}`}
          ListHeaderComponent={
            <Text style={{ color: (alertas?.denegados ?? 0) > 0 ? colores.peligro : colores.textoSuave, fontSize: 13, marginBottom: 8 }}>
              {alertas?.total ?? 0} intentos · {alertas?.denegados ?? 0} denegados
            </Text>
          }
          ListEmptyComponent={<Text style={styles.vacio}>Sin intentos registrados.</Text>}
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: item.critico ? colores.peligro : colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.gestor}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{item.fecha} · {item.motivo}</Text>
              </View>
              <Text style={{ color: item.resultado === "ok" ? colores.acento : colores.peligro, fontSize: 11 }}>{item.resultado}</Text>
            </View>
          )}
        />
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
  seccion: { fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 8 },
  botonGuardar: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
});
