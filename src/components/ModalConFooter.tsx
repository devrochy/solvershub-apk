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
  /** Línea secundaria bajo el título (opcional). */
  subtitulo?: string;
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
 * y footer con botones (ej. Cancelar/Confirmar). El header usa el azul principal
 * (`#172f6c`) y el resto del modal tonos pastel suaves para que la interfaz no
 * sea brusca. Se usa en: editar cliente, nuevo préstamo, avatar, detalle de
 * cuota, registrar pago/no pago, nuevo cliente, nuevo gasto y nueva nota.
 */
export function ModalConFooter({
  visible,
  titulo,
  subtitulo,
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
          <View style={styles.header} testID="modal-header">
            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>{titulo}</Text>
              {subtitulo ? (
                <Text style={styles.subtitulo}>{subtitulo}</Text>
              ) : null}
            </View>
            <Pressable
              testID={cerrarTestID}
              style={styles.botonCerrar}
              onPress={onCerrar}
            >
              <MaterialIcons name="close" size={22} color="#ffffff" />
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
    backgroundColor: "rgba(23, 47, 108, 0.25)",
    justifyContent: "flex-end",
  },
  carta: {
    backgroundColor: "#f5f7ff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    paddingBottom: 24,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#172f6c",
  },
  headerTexto: { flex: 1 },
  botonCerrar: {
    width: 36,
    height: 36,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  titulo: {
    textAlign: "left",
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    fontFamily: "Roboto_700Bold",
  },
  subtitulo: {
    color: "#d4dff0",
    fontSize: 13,
    marginTop: 2,
    fontFamily: "Roboto_400Regular",
  },
  cuerpo: { padding: 16, gap: 10, flexShrink: 1 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 4 },
  boton: { flex: 1 },
  botonCancelar: {
    backgroundColor: "#eef2ff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonCancelarTexto: { color: "#172f6c", fontWeight: "600" },
  botonConfirmar: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonConfirmarTexto: { color: "#ffffff", fontWeight: "600" },
  botonDeshabilitado: { opacity: 0.5 },
});
