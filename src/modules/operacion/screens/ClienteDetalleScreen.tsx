import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  alternarAgenteDelCliente,
  corregirDatosDelCliente,
  etiquetaDelDato,
  fichaDelCliente,
  origenDelDato,
  textoDelDato,
  type FichaDelCliente,
} from "../api";
import type { OperacionStackParamList } from "../navigation";

type Props = NativeStackScreenProps<OperacionStackParamList, "ClienteDetalle">;

/**
 * Ficha del cliente (HU-CRM-02): información general, el interruptor del agente solo para este
 * cliente, su clasificación y lo que sabemos de él (con origen y fecha), con corrección de datos.
 * Misma API que la ficha del panel (HU-UX-16).
 */
export function ClienteDetalleScreen({ route, navigation }: Props) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { id } = route.params;

  const [ficha, setFicha] = useState<FichaDelCliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setFicha(await fichaDelCliente(api, id));
      setError(null);
    } catch {
      setError("No pudimos cargar el cliente.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator color={colores.primario} />
      </View>
    );
  }
  if (!ficha) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <Text testID="cliente-error" style={{ color: colores.peligro }}>
          {error ?? "Cliente no encontrado."}
        </Text>
      </View>
    );
  }

  const perfil = ficha.datos.filter((d) => d.namespace === "perfil" && d.key !== "name");

  const alternar = async () => {
    const antes = ficha.bot_paused;
    setFicha({ ...ficha, bot_paused: !antes });
    try {
      const pausado = await alternarAgenteDelCliente(api, id);
      setFicha((f) => (f ? { ...f, bot_paused: pausado } : f));
    } catch {
      setFicha((f) => (f ? { ...f, bot_paused: antes } : f));
      setError("No se pudo cambiar el agente para este cliente.");
    }
  };

  const empezarEdicion = () => {
    setValores(
      Object.fromEntries([
        ["name", ficha.nombre ?? ""],
        ...perfil.map((d) => [d.key, textoDelDato(d.value) === "—" ? "" : textoDelDato(d.value)]),
      ]),
    );
    setEditando(true);
  };

  const guardar = async () => {
    const original: Record<string, string> = Object.fromEntries([
      ["name", ficha.nombre ?? ""],
      ...perfil.map((d) => [d.key, textoDelDato(d.value) === "—" ? "" : textoDelDato(d.value)]),
    ]);
    const cambios = Object.fromEntries(
      Object.entries(valores)
        .map(([k, v]) => [k, v.trim()] as const)
        .filter(([k, v]) => v !== (original[k] ?? "").trim()),
    );
    if (Object.keys(cambios).length === 0) {
      setEditando(false);
      return;
    }
    setGuardando(true);
    try {
      setFicha(await corregirDatosDelCliente(api, id, cambios));
      setEditando(false);
      setError(null);
    } catch {
      setError("No se pudieron guardar los datos. Revisa que no estén vacíos.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={styles.contenedor}>
      {error && (
        <Text testID="cliente-error" style={[styles.error, { color: colores.peligro }]}>
          {error}
        </Text>
      )}

      <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
        <Text style={[styles.titulo, { color: colores.texto }]}>{ficha.cliente}</Text>
        <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
          {ficha.canal} · {ficha.identificador}
        </Text>
        <View style={styles.filaAgente}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colores.texto, fontWeight: "600" }}>Agente</Text>
            <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
              {ficha.bot_paused ? "Pausado para este cliente" : "Atiende a este cliente"}
            </Text>
          </View>
          <Switch
            testID="cliente-agente"
            accessibilityLabel={ficha.bot_paused ? "Activar el agente" : "Pausar el agente"}
            value={!ficha.bot_paused}
            onValueChange={() => void alternar()}
          />
        </View>
        <Linea etiqueta="Teléfono" valor={ficha.telefono ?? "—"} />
        <Linea etiqueta="Conexiones" valor={ficha.conexiones.map((c) => c.label).join(", ") || "—"} />
        {ficha.columns.map((col) => (
          <Linea key={col.key} etiqueta={col.label} valor={textoDelDato(ficha.extras[col.key])} />
        ))}
        {ficha.ultima_conversacion_id && (
          <Pressable
            testID="cliente-abrir-conversacion"
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate("ConversacionDetalle", {
                id: ficha.ultima_conversacion_id as string,
                titulo: ficha.cliente,
              })
            }
            style={styles.enlace}
          >
            <Text style={{ color: colores.primario, fontWeight: "600" }}>Abrir su última conversación</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.cabeceraSeccion}>
        <Text style={[styles.seccion, { color: colores.texto }]}>Lo que sabemos</Text>
        {!editando && (
          <Pressable testID="cliente-editar" accessibilityRole="button" onPress={empezarEdicion}>
            <Text style={{ color: colores.primario, fontWeight: "600" }}>Editar</Text>
          </Pressable>
        )}
      </View>

      {editando ? (
        <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
          <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 8 }}>
            Lo que corrijas queda como dato de una persona y el agente lo usa en la siguiente conversación.
          </Text>
          {Object.keys(valores).map((clave) => (
            <View key={clave} style={styles.campoGrupo}>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{etiquetaDelDato(clave)}</Text>
              <TextInput
                testID={`cliente-campo-${clave}`}
                value={valores[clave]}
                onChangeText={(t) => setValores((v) => ({ ...v, [clave]: t }))}
                maxLength={500}
                style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
              />
            </View>
          ))}
          <View style={styles.acciones}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setEditando(false)}
              style={[styles.boton, { borderColor: colores.borde }]}
            >
              <Text style={{ color: colores.texto }}>Cancelar</Text>
            </Pressable>
            <Pressable
              testID="cliente-guardar"
              accessibilityRole="button"
              disabled={guardando}
              onPress={() => void guardar()}
              style={[styles.boton, { borderColor: colores.primario, backgroundColor: colores.primario }]}
            >
              <Text style={{ color: "#ffffff", fontWeight: "700" }}>{guardando ? "Guardando…" : "Guardar"}</Text>
            </Pressable>
          </View>
        </View>
      ) : perfil.length === 0 ? (
        <Text style={{ color: colores.textoSuave }}>
          Todavía no hay datos guardados. El agente los va guardando en la conversación.
        </Text>
      ) : (
        perfil.map((d) => (
          <View
            key={d.key}
            testID={`cliente-dato-${d.key}`}
            style={[styles.dato, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>{etiquetaDelDato(d.key)}</Text>
              <Text style={{ color: colores.texto }}>{textoDelDato(d.value)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: d.source === "human" ? colores.primario : colores.textoSuave, fontSize: 12 }}>
                {origenDelDato(d.source)}
              </Text>
              <Text style={{ color: colores.textoSuave, fontSize: 11 }}>{d.valid_from.slice(0, 10)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function Linea({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const { colores } = useTheme();
  return (
    <View style={styles.linea}>
      <Text style={{ color: colores.textoSuave, width: 120 }}>{etiqueta}</Text>
      <Text style={{ color: colores.texto, flex: 1 }}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { padding: 16, gap: 12 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  titulo: { fontSize: 18, fontWeight: "700" },
  filaAgente: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  linea: { flexDirection: "row", paddingVertical: 2 },
  enlace: { marginTop: 8 },
  cabeceraSeccion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seccion: { fontSize: 15, fontWeight: "700" },
  dato: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  campoGrupo: { marginBottom: 10 },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
  acciones: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  boton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  error: { fontSize: 13 },
});
