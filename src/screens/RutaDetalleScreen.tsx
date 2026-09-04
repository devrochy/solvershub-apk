import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { apiErrorStatus } from "../api/client";
import { CargaError } from "../components/CargaError";
import { ModalConFooter } from "../components/ModalConFooter";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import { useRutaActiva } from "../session/ruta-activa-context";
import type {
  ClienteCobradorPublic,
  DiaApkPublic,
  RutaNotaPublic,
} from "../types/cobrador";

export interface RutaDetalleScreenProps {
  rutaId?: number;
  rutaNombre?: string;
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

/**
 * Detalle de ruta (B3/N3): información de la ruta con KPIs (total clientes,
 * clientes del día, en mora, estado) y sección de notas con alta desde un
 * modal. Se usa como pestaña "Ruta" del menú (lee la ruta activa del contexto)
 * y, opcionalmente, como overlay con props. La edición de ruta es solo lectura
 * por ahora (backlog); la edición real se realiza desde el panel admin.
 */
export function RutaDetalleScreen({
  rutaId: rutaIdProp,
  rutaNombre: rutaNombreProp,
  onCerrar,
}: RutaDetalleScreenProps = {}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { api, logout } = useSession();
  const { rutaActiva } = useRutaActiva();

  const rutaId = rutaIdProp ?? rutaActiva?.rutaId ?? 0;
  const rutaNombre = rutaNombreProp ?? rutaActiva?.rutaNombre ?? "";
  const cerrar = onCerrar ?? (() => navigation.navigate("SeleccionRuta"));

  const [clientes, setClientes] = useState<ClienteCobradorPublic[] | null>(null);
  const [dia, setDia] = useState<DiaApkPublic | null>(null);
  const [notas, setNotas] = useState<RutaNotaPublic[] | null>(null);
  const [estatus, setEstatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [notaAbierta, setNotaAbierta] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [notaEnviando, setNotaEnviando] = useState(false);
  const [notaMensaje, setNotaMensaje] = useState<string | null>(null);
  const [avisoEdicion, setAvisoEdicion] = useState(false);

  const cargar = useCallback(async () => {
    if (!rutaId) {
      return;
    }
    setError(null);
    try {
      const [misRutas, listaClientes, diaRuta, listaNotas] = await Promise.all([
        api.misRutas(),
        api.listarClientesDeRuta(rutaId),
        api.dia(rutaId),
        api.listarNotas(rutaId),
      ]);
      setClientes(listaClientes);
      setDia(diaRuta);
      setNotas(listaNotas);
      setEstatus(misRutas.find((r) => r.id === rutaId)?.estatus ?? "activo");
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudieron cargar los datos de la ruta.");
      }
    }
  }, [api, rutaId, logout]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  async function guardarNota() {
    if (!notaTexto.trim()) {
      setNotaMensaje("Escribe el texto de la nota.");
      return;
    }
    setNotaEnviando(true);
    setNotaMensaje(null);
    try {
      await api.crearNota(rutaId, notaTexto.trim());
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

  if (!rutaId) {
    return (
      <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
        <View style={styles.sinRuta}>
          <Text style={styles.sinRutaTexto}>Selecciona una ruta para ver su información.</Text>
          <Pressable testID="btn-ir-seleccion" style={styles.botonSinRuta} onPress={cerrar}>
            <Text style={styles.botonSinRutaTexto}>Seleccionar ruta</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!clientes || !dia || !notas || estatus === null) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const enMora = dia.clientes.filter((c) => c.color === "rojo").length;

  return (
    <SafeAreaView style={styles.contenedor} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Pressable testID="btn-back-ruta" style={styles.headerIzquierda} onPress={cerrar}>
          <MaterialIcons name="arrow-back" size={22} color="#334155" />
        </Pressable>
        <Text style={styles.headerTitulo} numberOfLines={1}>
          {rutaNombre}
        </Text>
        <Pressable testID="btn-editar-ruta" style={styles.headerDerecha} onPress={() => setAvisoEdicion(true)}>
          <MaterialIcons name="edit" size={20} color="#2563eb" />
          <Text style={styles.headerAccion}>Editar</Text>
        </Pressable>
      </View>

      {avisoEdicion ? (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            La edición de ruta se realiza desde el panel.
          </Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContenido}>
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Información de la ruta</Text>
          <View style={styles.kpis}>
            <View style={styles.kpi}>
              <MaterialIcons name="people" size={22} color="#2563eb" />
              <Text style={styles.kpiValor} testID="kpi-total-clientes">
                {clientes.length}
              </Text>
              <Text style={styles.kpiEtiqueta}>Clientes</Text>
            </View>
            <View style={styles.kpi}>
              <MaterialIcons name="today" size={22} color="#0891b2" />
              <Text style={styles.kpiValor} testID="kpi-clientes-dia">
                {dia.clientes.length}
              </Text>
              <Text style={styles.kpiEtiqueta}>Del día</Text>
            </View>
            <View style={styles.kpi}>
              <MaterialIcons name="warning" size={22} color="#dc2626" />
              <Text style={styles.kpiValor} testID="kpi-en-mora">
                {enMora}
              </Text>
              <Text style={styles.kpiEtiqueta}>En mora</Text>
            </View>
          </View>
          <View style={styles.estadoFila}>
            <Text style={styles.estadoEtiqueta}>Estado</Text>
            <Text style={styles.estadoValor}>{estatus}</Text>
          </View>
        </View>

        <View style={styles.seccion}>
          <View style={styles.seccionFila}>
            <Text style={styles.seccionTitulo}>Notas</Text>
            <Pressable
              testID="btn-agregar-nota"
              style={styles.botonNota}
              onPress={() => {
                setNotaAbierta(true);
                setNotaMensaje(null);
              }}
            >
              <MaterialIcons name="add" size={16} color="#ffffff" />
              <Text style={styles.botonNotaTexto}>Nota</Text>
            </Pressable>
          </View>
          {notas.length === 0 ? (
            <Text style={styles.vacio}>Esta ruta no tiene notas.</Text>
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
        <TextInput
          testID="nota-textarea"
          style={styles.textarea}
          placeholder="Escribe una nota para la ruta…"
          multiline
          value={notaTexto}
          onChangeText={setNotaTexto}
        />
        {notaMensaje ? (
          <Text style={styles.notaMensaje}>{notaMensaje}</Text>
        ) : null}
        {notaEnviando ? <ActivityIndicator color="#2563eb" /> : null}
      </ModalConFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8fafc" },
  sinRuta: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  sinRutaTexto: { color: "#64748b", fontSize: 15, textAlign: "center" },
  botonSinRuta: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  botonSinRutaTexto: { color: "#ffffff", fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  headerIzquierda: { flexDirection: "row", alignItems: "center", gap: 4, width: 72 },
  headerDerecha: { flexDirection: "row", alignItems: "center", gap: 4, width: 72, justifyContent: "flex-end" },
  headerTitulo: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: "#334155" },
  headerAccion: { color: "#2563eb", fontWeight: "600", fontSize: 14 },
  aviso: {
    backgroundColor: "#fef9c3",
    borderBottomWidth: 1,
    borderBottomColor: "#fde68a",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avisoTexto: { color: "#92400e", fontSize: 13, fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContenido: { padding: 16, gap: 12 },
  seccion: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  seccionFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seccionTitulo: { fontSize: 14, fontWeight: "700", color: "#334155" },
  kpis: { flexDirection: "row", gap: 10 },
  kpi: { flex: 1, alignItems: "center", gap: 2 },
  kpiValor: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  kpiEtiqueta: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  estadoFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  estadoEtiqueta: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  estadoValor: { fontSize: 14, fontWeight: "700", color: "#2563eb" },
  botonNota: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  botonNotaTexto: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  vacio: { color: "#64748b", fontSize: 13 },
  nota: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  notaTexto: { fontSize: 14, color: "#334155" },
  notaMeta: { fontSize: 12, color: "#64748b" },
  textarea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: "top",
  },
  notaMensaje: { color: "#dc2626", fontSize: 13 },
});