import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useTheme } from "@core/theme/theme-context";
import { useAdminApi } from "@core/session/use-admin-api";
import {
  abrirCaja,
  ajustarCaja,
  cargarCaja,
  cargarRuta,
  cerrarCaja,
  inyectarCapital,
  liquidarCartera,
  optimizarRuta,
  type CarteraCaja,
  type Ruta,
} from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";

type Props = NativeStackScreenProps<CobranzaAdminStackParamList, "CarteraDetalle">;

type ModalActivo = "ninguno" | "ajuste" | "inyeccion";

export function CarteraDetalleScreen({ route }: Props) {
  const { colores } = useTheme();
  const api = useAdminApi();
  const { id, titulo } = route.params;
  const [caja, setCaja] = useState<CarteraCaja | null>(null);
  const [ruta, setRuta] = useState<Ruta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalActivo>("ninguno");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const [c, r] = await Promise.all([
        cargarCaja(api, id),
        cargarRuta(api, id).catch(() => null),
      ]);
      setCaja(c);
      setRuta(r);
    } catch {
      setError("No pudimos cargar la cartera.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras el await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const ejecutar = async (accion: () => Promise<unknown>, exito?: string) => {
    setEnviando(true);
    try {
      await accion();
      setModal("ninguno");
      setValor("");
      setMotivo("");
      await cargar();
      if (exito) {
        Alert.alert("Listo", exito);
      }
    } catch {
      setError("No se pudo completar la acción.");
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = (tituloAlerta: string, mensaje: string, accion: () => Promise<void>, exito?: string) => {
    Alert.alert(tituloAlerta, mensaje, [
      { text: "Cancelar", style: "cancel" },
      { text: "Confirmar", onPress: () => void ejecutar(accion, exito) },
    ]);
  };

  const enviarModal = () => {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) {
      setError("Escribe un valor numérico.");
      return;
    }
    if (modal === "ajuste") {
      void ejecutar(() => ajustarCaja(api, id, numero, motivo), "Caja ajustada.");
    } else {
      void ejecutar(() => inyectarCapital(api, id, numero, motivo), "Inyección registrada.");
    }
  };

  const liquidar = () => {
    Alert.alert("Liquidar cartera", "¿Qué período liquidamos?", [
      ...["diario", "semanal", "quincenal", "mensual"].map((periodo) => ({
        text: periodo,
        onPress: () => void ejecutar(() => liquidarCartera(api, id, periodo), "Liquidación generada."),
      })),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colores.fondo }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={styles.contenido}>
      <Text style={[styles.titulo, { color: colores.texto }]}>{titulo}</Text>
      {error ? <Text style={{ color: colores.peligro, marginBottom: 8 }}>{error}</Text> : null}

      <View style={[styles.tarjeta, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
        <Text style={[styles.saldo, { color: colores.texto }]}>
          ${caja?.saldo_actual ?? 0}
        </Text>
        <Text style={{ color: colores.textoSuave, fontSize: 12 }}>Caja actual · inicial ${caja?.saldo_inicial ?? 0}</Text>
      </View>

      <View style={styles.botones}>
        <Boton label="Abrir caja" onPress={() => confirmar("Abrir caja", "¿Abrir la caja del día?", () => abrirCaja(api, id), "Caja abierta.")} />
        <Boton label="Cerrar caja" onPress={() => confirmar("Cerrar caja", "¿Cerrar la caja del día?", () => cerrarCaja(api, id), "Caja cerrada.")} />
        <Boton label="Ajustar" onPress={() => setModal("ajuste")} />
        <Boton label="Inyectar" onPress={() => setModal("inyeccion")} />
        <Boton label="Liquidar" onPress={liquidar} />
        <Boton label="Optimizar ruta" onPress={() => void ejecutar(() => optimizarRuta(api, id), "Ruta optimizada.")} />
      </View>

      <Text style={[styles.seccion, { color: colores.texto }]}>Ruta del día</Text>
      {ruta?.plan ? (
        <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 6 }}>
          {ruta.plan.orden.length} visitas · {ruta.plan.distancia_km} km · {ruta.plan.tiempo_min} min
        </Text>
      ) : null}
      {(ruta?.clientes ?? []).length === 0 ? (
        <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 12 }}>
          Sin visitas para hoy.
        </Text>
      ) : (
        (ruta?.clientes ?? []).map((c, i) => (
          <View key={c.id} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
            <Text style={{ color: colores.texto, fontWeight: "600" }}>{i + 1}. {c.cliente}</Text>
            <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
              saldo ${c.saldo} · mora {c.mora} · {c.riesgo}
            </Text>
          </View>
        ))
      )}

      <Modal visible={modal !== "ninguno"} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              {modal === "ajuste" ? "Ajustar caja" : "Inyectar capital"}
            </Text>
            <TextInput
              testID="modal-valor"
              value={valor}
              onChangeText={setValor}
              keyboardType="numeric"
              placeholder={modal === "ajuste" ? "Nuevo saldo" : "Valor a inyectar"}
              placeholderTextColor={colores.textoSuave}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
            />
            <TextInput
              testID="modal-motivo"
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Motivo / comentario"
              placeholderTextColor={colores.textoSuave}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]}
            />
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModal("ninguno")} style={styles.modalBoton}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable
                testID="modal-confirmar"
                disabled={enviando}
                onPress={enviarModal}
                style={[styles.modalBoton, { backgroundColor: colores.primario, borderRadius: 8 }]}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Boton({ label, onPress }: { label: string; onPress(): void }) {
  const { colores } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.boton, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
    >
      <Text style={{ color: colores.texto, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: 14, paddingBottom: 40 },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  saldo: { fontSize: 26, fontWeight: "700" },
  botones: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  boton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  seccion: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  fila: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 4 },
  modalBoton: { paddingHorizontal: 14, paddingVertical: 10 },
});
