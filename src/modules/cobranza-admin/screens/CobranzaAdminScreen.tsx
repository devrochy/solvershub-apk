import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  cargarAuditoria,
  cargarClientes,
  cargarDispositivos,
  cargarPagos,
  cargarPromesas,
  cargarResumen,
  cambiarEstadoDispositivo,
  cambiarEstadoPromesa,
  type AuditoriaCobranza,
  type ClientRow,
  type DeviceRow,
  type Dispositivos,
  type Kpi,
  type PagoAdmin,
  type PromesaAdmin,
} from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";

type Nav = NativeStackNavigationProp<CobranzaAdminStackParamList>;
type Pestana = "resumen" | "clientes" | "pagos" | "promesas" | "dispositivos" | "auditoria";

const PESTANAS: { clave: Pestana; label: string }[] = [
  { clave: "resumen", label: "Resumen" },
  { clave: "clientes", label: "Clientes" },
  { clave: "pagos", label: "Pagos" },
  { clave: "promesas", label: "Promesas" },
  { clave: "dispositivos", label: "Dispositivos" },
  { clave: "auditoria", label: "Auditoría" },
];

export function CobranzaAdminScreen() {
  const { colores } = useTheme();
  const api = useAdminApi();
  const navigation = useNavigation<Nav>();
  const [pestana, setPestana] = useState<Pestana>("resumen");
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [clientes, setClientes] = useState<ClientRow[]>([]);
  const [pagos, setPagos] = useState<PagoAdmin[]>([]);
  const [promesas, setPromesas] = useState<PromesaAdmin[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivos | null>(null);
  const [auditoria, setAuditoria] = useState<AuditoriaCobranza | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const [r, c, p, pr, d, a] = await Promise.all([
        cargarResumen(api),
        cargarClientes(api, busqueda || undefined),
        cargarPagos(api),
        cargarPromesas(api),
        cargarDispositivos(api),
        cargarAuditoria(api),
      ]);
      setError(null);
      setKpis(r.kpis);
      setClientes(c);
      setPagos(p);
      setPromesas(pr);
      setDispositivos(d);
      setAuditoria(a);
    } catch {
      setError("No pudimos cargar la cobranza. Revisa tu conexión.");
    }
  }, [api, busqueda]);

  useEffect(() => {
    const temporizador = setTimeout(
      // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras el await
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
          void cambiarEstadoPromesa(api, p.id, estado)
            .then(cargar)
            .catch(() => setError("No se pudo cambiar la promesa."));
        },
      })),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  const cambiarDispositivo = (d: DeviceRow) => {
    const aprobar = d.estado !== "activo";
    Alert.alert(
      `${aprobar ? "Aprobar" : "Bloquear"} dispositivo`,
      `${d.gestor ?? d.codigo ?? "Dispositivo"} ${aprobar ? "podrá operar en campo." : "dejará de operar en campo."}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: aprobar ? "Aprobar" : "Bloquear",
          style: aprobar ? "default" : "destructive",
          onPress: () => {
            void cambiarEstadoDispositivo(api, d.id, aprobar ? "activo" : "bloqueado")
              .then(cargar)
              .catch(() => setError("No se pudo cambiar el dispositivo."));
          },
        },
      ],
    );
  };

  const abrirCliente = (c: ClientRow) =>
    navigation.navigate("ClienteDetalle", {
      id: c.id,
      titulo: `${c.nombre} ${c.apellido ?? ""}`.trim() || "Cliente",
    });

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      <View style={[styles.pestanas, { borderColor: colores.borde }]}>
        {PESTANAS.map((p) => (
          <Pressable
            key={p.clave}
            testID={`cobranza-${p.clave}`}
            onPress={() => setPestana(p.clave)}
            style={[
              styles.pestana,
              pestana === p.clave && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={{
                color: pestana === p.clave ? colores.texto : colores.textoSuave,
                fontSize: 11,
                fontWeight: "600",
              }}
              numberOfLines={1}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text testID="cobranza-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

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
      ) : pestana === "clientes" ? (
        <>
          <TextInput
            testID="cobranza-busqueda"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre o documento"
            placeholderTextColor={colores.textoSuave}
            style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
          />
          <FlatList
            testID="cobranza-lista-clientes"
            data={clientes}
            keyExtractor={(c) => c.id}
            ListEmptyComponent={
              <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
                Sin clientes.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => abrirCliente(item)}
                style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colores.texto, fontWeight: "600" }}>
                    {item.nombre} {item.apellido ?? ""}
                  </Text>
                  <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                    {item.numero_documento ?? item.telefono ?? "—"} · {item.cartera ?? "sin cartera"}
                  </Text>
                </View>
                <Text style={{ color: colores.acento, fontSize: 11 }}>{item.color_riesgo} ›</Text>
              </Pressable>
            )}
          />
        </>
      ) : pestana === "pagos" ? (
        <FlatList
          testID="cobranza-lista-pagos"
          data={pagos}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin pagos recientes.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.cliente}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.fecha_hora} · {item.metodo_pago ?? "—"}
                </Text>
              </View>
              <Text style={{ color: colores.texto }}>${item.valor}</Text>
            </View>
          )}
        />
      ) : pestana === "promesas" ? (
        <FlatList
          testID="cobranza-lista-promesas"
          data={promesas}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin promesas.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => cambiarPromesa(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>{item.cliente}</Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.fecha_prometida ?? "—"} · ${item.valor_prometido}
                </Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 11 }}>{item.estado} ›</Text>
            </Pressable>
          )}
        />
      ) : pestana === "dispositivos" ? (
        <FlatList
          testID="cobranza-lista-dispositivos"
          data={dispositivos?.dispositivos ?? []}
          keyExtractor={(d) => d.id}
          ListHeaderComponent={
            (dispositivos?.pendientes ?? 0) > 0 ? (
              <Text style={{ color: colores.peligro, fontSize: 13, marginBottom: 8 }}>
                {dispositivos?.pendientes} pendiente(s) de aprobación
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin dispositivos.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => cambiarDispositivo(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {item.gestor ?? item.codigo ?? "Dispositivo"}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.imei ?? "sin IMEI"} · {item.whatsapp ?? "—"}
                </Text>
              </View>
              <Text style={{ color: item.estado === "activo" ? colores.acento : colores.peligro, fontSize: 11 }}>
                {item.estado}
              </Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="cobranza-lista-auditoria"
          data={auditoria?.filas ?? []}
          keyExtractor={(f, i) => `${f.fecha}-${f.entidad_id ?? ""}-${i}`}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin movimientos auditados.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontWeight: "600" }}>
                  {item.entidad} · {item.operacion}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                  {item.fecha} · {item.actor ?? "—"}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: 10 },
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: 10 },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center", paddingHorizontal: 2 },
  campo: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  kpiValor: { fontSize: 20, fontWeight: "700" },
});
