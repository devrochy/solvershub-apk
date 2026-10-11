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
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, useKit, type KitTema } from "@shared/ui";

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
 * y footer con botones (ej. Cancelar/Confirmar). El header usa la banda de
 * marca del tema y el footer los `Button` del kit (`secondary` + `primary`, 48
 * dp, en la zona del pulgar). Se usa en: editar cliente, nuevo préstamo,
 * avatar, detalle de cuota, registrar pago/no pago, nuevo cliente, nuevo gasto
 * y nueva nota.
 *
 * HU-DS-10 conserva el comportamiento (D-SPEC-29-6): solo cierra con la X, el
 * back de Android o Cancelar; no con el fondo ni con un gesto, para que un pago
 * a medio escribir no se pierda por un toque accidental (ver la tarea).
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
  const kit = useKit();
  const styles = useMemo(() => crearEstilos(kit), [kit]);
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
              <Text accessibilityRole="header" style={styles.titulo}>
                {titulo}
              </Text>
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
              <MaterialIcons name="close" size={24} color={kit.banda.texto} />
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
                <Button
                  testID={cancelarTestID}
                  variant="secondary"
                  fullWidth
                  style={styles.boton}
                  onPress={onCancelar}
                >
                  {labelCancelar}
                </Button>
              ) : (
                <View style={styles.boton} />
              )}
              {onConfirmar ? (
                <Button
                  testID={confirmarTestID}
                  variant="primary"
                  fullWidth
                  style={styles.boton}
                  disabled={confirmando}
                  onPress={onConfirmar}
                >
                  {confirmando ? "Guardando…" : labelConfirmar}
                </Button>
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

function crearEstilos({ c, banda }: KitTema) {
  return StyleSheet.create({
    fondo: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: "flex-end",
    },
    carta: {
      backgroundColor: c.surface,
      borderTopLeftRadius: shRadius.lg,
      borderTopRightRadius: shRadius.lg,
      overflow: "hidden",
      paddingBottom: shSpace[6],
      maxHeight: "88%",
      boxShadow: c.elev3,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingLeft: shSpace[4],
      paddingRight: shSpace[2],
      paddingVertical: shSpace[1],
      backgroundColor: banda.fondo,
    },
    headerTexto: { flex: 1, paddingVertical: shSpace[2] },
    botonCerrar: {
      width: shDensity.controlLg,
      height: shDensity.controlLg,
      alignItems: "flex-end",
      justifyContent: "center",
    },
    titulo: {
      ...shType.block,
      textAlign: "left",
      color: banda.texto,
    },
    subtitulo: {
      ...shType.dense,
      color: banda.textoSuave,
      marginTop: 2,
    },
    cuerpoScroll: { flexShrink: 1 },
    cuerpo: { padding: shSpace[4], gap: shSpace[3] },
    footer: {
      flexDirection: "row",
      gap: shSpace[3],
      paddingHorizontal: shSpace[4],
      paddingTop: shSpace[3],
      borderTopWidth: 1,
      borderTopColor: c.borderSoft,
    },
    boton: { flex: 1 },
  });
}
