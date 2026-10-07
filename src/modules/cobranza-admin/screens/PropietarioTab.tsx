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
import { useTheme } from "@core/theme/theme-context";
import type { ClienteAdmin } from "@core/api/admin";
import {
  cargarCobrosPropietario,
  cargarHiloPropietario,
  crearCobroPropietario,
  enviarMensajePropietario,
  registrarPagoPropietario,
  type HiloPropietario,
  type OwnerCharge,
} from "../api";

export function PropietarioTab({ api }: { api: ClienteAdmin }) {
  const { colores } = useTheme();
  const [cobros, setCobros] = useState<OwnerCharge[]>([]);
  const [hilo, setHilo] = useState<HiloPropietario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalCobro, setModalCobro] = useState(false);
  const [modalPago, setModalPago] = useState<OwnerCharge | null>(null);
  const [campoPeriodo, setCampoPeriodo] = useState("");
  const [campoMonto, setCampoMonto] = useState("");
  const [campoVence, setCampoVence] = useState("");
  const [campoPago, setCampoPago] = useState("");
  const [campoMensaje, setCampoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const [c, h] = await Promise.all([
        cargarCobrosPropietario(api),
        cargarHiloPropietario(api),
      ]);
      setCobros(c.cobros);
      setHilo(h);
    } catch {
      setError("No pudimos cargar la sección del propietario.");
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const crearCobro = async () => {
    if (!campoPeriodo.trim() || !Number(campoMonto)) {
      setError("Período y monto son obligatorios.");
      return;
    }
    setEnviando(true);
    try {
      await crearCobroPropietario(api, {
        periodo: campoPeriodo.trim(),
        monto: Number(campoMonto),
        fecha_vencimiento: campoVence.trim() || new Date().toISOString().slice(0, 10),
      });
      setModalCobro(false);
      setCampoPeriodo("");
      setCampoMonto("");
      setCampoVence("");
      await cargar();
    } catch {
      setError("No se pudo crear el cobro.");
    } finally {
      setEnviando(false);
    }
  };

  const pagar = async () => {
    if (!modalPago || !Number(campoPago)) {
      return;
    }
    setEnviando(true);
    try {
      await registrarPagoPropietario(api, modalPago.id, { monto_pagado: Number(campoPago), metodo_pago: "efectivo" });
      setModalPago(null);
      setCampoPago("");
      await cargar();
    } catch {
      setError("No se pudo registrar el pago.");
    } finally {
      setEnviando(false);
    }
  };

  const enviar = async () => {
    if (!campoMensaje.trim()) {
      return;
    }
    setEnviando(true);
    try {
      await enviarMensajePropietario(api, campoMensaje.trim());
      setCampoMensaje("");
      await cargar();
    } catch {
      setError("No se pudo enviar el mensaje.");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) {
    return <ActivityIndicator size="large" style={{ marginTop: 30 }} />;
  }

  return (
    <ScrollView testID="propietario-contenedor">
      {error ? (
        <Text testID="propietario-error" style={{ color: colores.peligro, marginBottom: 8 }}>
          {error}
        </Text>
      ) : null}

      <View style={styles.filaTitulo}>
        <Text style={[styles.seccion, { color: colores.texto }]}>Cobros al propietario</Text>
        <Pressable
          testID="propietario-nuevo-cobro"
          onPress={() => setModalCobro(true)}
          style={[styles.botonChico, { backgroundColor: colores.primario }]}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 12 }}>+ Nuevo cobro</Text>
        </Pressable>
      </View>

      {cobros.length === 0 ? (
        <Text style={styles.vacio}>Sin cobros al propietario.</Text>
      ) : (
        cobros.map((c) => (
          <View key={c.id} style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colores.texto, fontWeight: "600" }}>{c.periodo}</Text>
              <Text style={{ color: colores.textoSuave, fontSize: 12 }}>
                monto ${c.monto} · pagado ${c.pagado ?? 0} · vence {c.vence}
              </Text>
            </View>
            {c.estado === "pagado" ? (
              <Text style={{ color: colores.acento, fontSize: 11 }}>pagado</Text>
            ) : (
              <Pressable
                testID={`cobro-pagar-${c.id}`}
                onPress={() => setModalPago(c)}
                style={{ padding: 6 }}
              >
                <Text style={{ color: colores.acento, fontSize: 12, fontWeight: "700" }}>Registrar pago</Text>
              </Pressable>
            )}
          </View>
        ))
      )}

      <Text style={[styles.seccion, { color: colores.texto, marginTop: 14 }]}>
        Hilo con gestores{hilo?.abierto ? "" : " · cerrado"}
      </Text>
      {hilo?.whatsapp ? (
        <Text style={{ color: colores.textoSuave, fontSize: 12, marginBottom: 8 }}>
          {hilo.whatsapp} · {hilo.asunto || "sin asunto"}
        </Text>
      ) : null}

      {hilo && hilo.mensajes.length === 0 ? (
        <Text style={styles.vacio}>Sin mensajes.</Text>
      ) : (
        (hilo?.mensajes ?? []).map((m) => (
          <View
            key={m.id}
            testID={`mensaje-propietario-${m.id}`}
            style={[
              styles.burbuja,
              {
                backgroundColor: m.direccion === "entrante" ? colores.tarjeta : colores.acento,
                alignSelf: m.direccion === "entrante" ? "flex-start" : "flex-end",
                borderColor: colores.borde,
              },
            ]}
          >
            <Text style={{ color: m.direccion === "entrante" ? colores.texto : "#ffffff", fontSize: 13 }}>
              {m.contenido}
            </Text>
            <Text
              style={{
                color: m.direccion === "entrante" ? colores.textoSuave : "#ffffffcc",
                fontSize: 10,
                marginTop: 2,
              }}
            >
              {m.autor} · {m.fecha}
            </Text>
          </View>
        ))
      )}

      <View style={styles.filaEnviar}>
        <TextInput
          testID="propietario-mensaje"
          value={campoMensaje}
          onChangeText={setCampoMensaje}
          placeholder="Mensaje al gestor…"
          placeholderTextColor={colores.textoSuave}
          style={[styles.campoEnviar, { borderColor: colores.borde, color: colores.texto }]}
        />
        <Pressable
          testID="propietario-enviar"
          disabled={enviando}
          onPress={() => void enviar()}
          style={[styles.botonChico, { backgroundColor: colores.primario }]}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700" }}>Enviar</Text>
        </Pressable>
      </View>

      <Modal visible={modalCobro} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>Nuevo cobro al propietario</Text>
            <TextInput testID="cobro-periodo" value={campoPeriodo} onChangeText={setCampoPeriodo}
              placeholder="Período (p. ej. Octubre 2026)" placeholderTextColor={colores.textoSuave}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <TextInput testID="cobro-monto" value={campoMonto} onChangeText={setCampoMonto}
              placeholder="Monto" placeholderTextColor={colores.textoSuave} keyboardType="numeric"
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <TextInput testID="cobro-vence" value={campoVence} onChangeText={setCampoVence}
              placeholder="Vence (AAAA-MM-DD)" placeholderTextColor={colores.textoSuave}
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModalCobro(false)} style={{ padding: 10 }}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="cobro-crear" disabled={enviando} onPress={() => void crearCobro()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalPago !== null} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={[styles.modalCaja, { backgroundColor: colores.tarjeta }]}>
            <Text style={[styles.modalTitulo, { color: colores.texto }]}>
              Registrar pago · {modalPago?.periodo ?? ""}
            </Text>
            <TextInput testID="pago-monto" value={campoPago} onChangeText={setCampoPago}
              placeholder="Monto pagado" placeholderTextColor={colores.textoSuave} keyboardType="numeric"
              style={[styles.campo, { borderColor: colores.borde, color: colores.texto }]} />
            <View style={styles.modalBotones}>
              <Pressable onPress={() => setModalPago(null)} style={{ padding: 10 }}>
                <Text style={{ color: colores.textoSuave }}>Cancelar</Text>
              </Pressable>
              <Pressable testID="pago-guardar" disabled={enviando} onPress={() => void pagar()}
                style={[styles.modalBoton, { backgroundColor: colores.primario }]}>
                <Text style={{ color: "#ffffff", fontWeight: "700" }}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filaTitulo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seccion: { fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 8 },
  botonChico: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  fila: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" },
  vacio: { color: "#8695B0", textAlign: "center", marginTop: 14, marginBottom: 14 },
  burbuja: { borderRadius: 12, padding: 10, marginBottom: 8, maxWidth: "85%", borderWidth: 1 },
  filaEnviar: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 20 },
  campoEnviar: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCaja: { borderRadius: 14, padding: 18, gap: 10 },
  modalTitulo: { fontSize: 16, fontWeight: "700" },
  campo: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 10 },
  modalBotones: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  modalBoton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
