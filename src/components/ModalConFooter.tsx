import { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export interface ModalConFooterProps {
  visible: boolean;
  titulo: string;
  onCerrar(): void;
  children?: ReactNode;
  onCancelar?: () => void;
  onConfirmar?: () => void;
  confirmando?: boolean;
  labelCancelar?: string;
  labelConfirmar?: string;
  testID?: string;
  cerrarTestID?: string;
  cancelarTestID?: string;
  confirmarTestID?: string;
}

/**
 * Modal reutilizable con header (título + botón cerrar/back), cuerpo (children)
 * y footer con botones (ej. Cancelar/Confirmar). Se usa en el rediseño del
 * detalle de cliente para: editar cliente, nuevo préstamo, avatar, detalle de
 * cuota, registrar pago y registrar no pago.
 */
export function ModalConFooter({
  visible,
  titulo,
  onCerrar,
  children,
  onCancelar,
  onConfirmar,
  confirmando = false,
  labelCancelar = "Cancelar",
  labelConfirmar = "Guardar",
  testID,
  cerrarTestID = "modal-cerrar",
  cancelarTestID = "modal-cancelar",
  confirmarTestID = "modal-confirmar",
}: ModalConFooterProps) {
  const tieneFooter = Boolean(onCancelar || onConfirmar);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <View style={styles.fondo}>
        <View style={styles.carta} testID={testID}>
          <View style={styles.header}>
            <Text style={styles.titulo}>{titulo}</Text>
            <Pressable
              testID={cerrarTestID}
              style={styles.botonCerrar}
              onPress={onCerrar}
            >
              <MaterialIcons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <View style={styles.cuerpo}>{children}</View>

          {tieneFooter ? (
            <View style={styles.footer}>
              {onCancelar ? (
                <Pressable
                  testID={cancelarTestID}
                  style={[styles.boton, styles.botonCancelar]}
                  onPress={onCancelar}
                >
                  <Text style={styles.botonCancelarTexto}>{labelCancelar}</Text>
                </Pressable>
              ) : (
                <View style={styles.boton} />
              )}
              {onConfirmar ? (
                <Pressable
                  testID={confirmarTestID}
                  style={[
                    styles.boton,
                    styles.botonConfirmar,
                    confirmando && styles.botonDeshabilitado,
                  ]}
                  disabled={confirmando}
                  onPress={onConfirmar}
                >
                  <Text style={styles.botonConfirmarTexto}>
                    {confirmando ? "Guardando…" : labelConfirmar}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.boton} />
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  carta: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  botonCerrar: {
    width: 36,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  titulo: {
    flex: 1,
    textAlign: "left",
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
  },
  cuerpo: { padding: 16, gap: 10, flexShrink: 1 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 4 },
  boton: { flex: 1 },
  botonCancelar: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonCancelarTexto: { color: "#475569", fontWeight: "600" },
  botonConfirmar: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonConfirmarTexto: { color: "#ffffff", fontWeight: "600" },
  botonDeshabilitado: { opacity: 0.5 },
});