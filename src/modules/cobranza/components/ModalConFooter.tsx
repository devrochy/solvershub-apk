import { ReactNode, useMemo } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@core/theme/theme-context";
import type { ColoresTema } from "@core/theme/theme";
import { conAlfa } from "@core/theme/alpha";
import { shColor } from "@core/theme/tokens";

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
 * (navy-700 del tema) y el resto del modal tonos pastel suaves para que la interfaz no
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
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const tieneFooter = Boolean(onCancelar || onConfirmar);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCerrar}>
      <KeyboardAvoidingView
        style={styles.fondo}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.botonCerrar}
              hitSlop={10}
              onPress={onCerrar}
            >
              <MaterialIcons name="close" size={22} color={shColor.white} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.cuerpoScroll}
            contentContainerStyle={styles.cuerpo}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    fondo: {
      flex: 1,
      backgroundColor: "rgba(23, 47, 108, 0.25)",
      justifyContent: "flex-end",
    },
    carta: {
      backgroundColor: shColor.frost,
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
      backgroundColor: c.primario,
    },
    headerTexto: { flex: 1 },
    botonCerrar: {
      width: 44,
      height: 44,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    titulo: {
      textAlign: "left",
      fontSize: 16,
      fontWeight: "700",
      color: shColor.white,
      fontFamily: "Montserrat_700Bold",
    },
    subtitulo: {
      color: shColor.ice,
      fontSize: 13,
      marginTop: 2,
      fontFamily: "Inter_400Regular",
    },
    cuerpoScroll: { flexShrink: 1 },
    cuerpo: { padding: 16, gap: 10 },
    footer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 4 },
    boton: { flex: 1 },
    botonCancelar: {
      backgroundColor: c.activoSuave,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    botonCancelarTexto: { color: c.acento, fontWeight: "600" },
    botonConfirmar: {
      backgroundColor: shColor.blue["600"],
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    botonConfirmarTexto: { color: shColor.white, fontWeight: "600" },
    botonDeshabilitado: { opacity: 0.5 },
  });
}
