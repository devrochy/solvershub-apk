import { useMemo } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ModalConFooter } from "./ModalConFooter";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type {
  EvidenciaClienteSeleccionada,
  FuenteEvidencia,
} from "../features/cliente/use-evidencias-cliente";

type IconoVacio = React.ComponentProps<typeof MaterialIcons>["name"];

export interface EvidenciasModalProps {
  visible: boolean;
  titulo: string;
  /** Evidencia recién elegida (previsualización) para el campo del modal. */
  pendiente?: EvidenciaClienteSeleccionada;
  /** URL de la evidencia actual en el backend (ya resuelta). */
  urlActual?: string | null;
  cargando: boolean;
  confirmando: boolean;
  error: string | null;
  mensaje: string | null;
  iconoVacio?: IconoVacio;
  textoVacio: string;
  /** testID del contenedor del modal (`avatar-modal`, `documento-modal`). */
  testID: string;
  /** Prefijo de los testID internos: `<prefijo>-preview`, `<prefijo>-libreria`, … */
  prefijoTestID: string;
  guardarTestID: string;
  onElegir(fuente: FuenteEvidencia): void;
  onCerrar(): void;
  onConfirmar(): void;
}

/**
 * Modal de evidencia (foto del cliente o documento): preview de la imagen
 * pendiente/actual, estado vacío, botones de librería/cámara y estados de
 * carga/error. Compone `ModalConFooter`; la máquina de estados y la subida
 * viven en la pantalla (`ClienteScreen`).
 */
export function EvidenciasModal({
  visible,
  titulo,
  pendiente,
  urlActual,
  cargando,
  confirmando,
  error,
  mensaje,
  iconoVacio = "person",
  textoVacio,
  testID,
  prefijoTestID,
  guardarTestID,
  onElegir,
  onCerrar,
  onConfirmar,
}: EvidenciasModalProps) {
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
  const deshabilitado = confirmando || cargando;

  return (
    <ModalConFooter
      visible={visible}
      titulo={titulo}
      onCerrar={onCerrar}
      onCancelar={onCerrar}
      onConfirmar={onConfirmar}
      confirmando={confirmando}
      confirmarTestID={guardarTestID}
      testID={testID}
    >
      {pendiente ? (
        <Image
          testID={`${prefijoTestID}-preview`}
          source={{ uri: pendiente.uri }}
          style={styles.preview}
        />
      ) : urlActual ? (
        <Image
          testID={`${prefijoTestID}-foto-actual`}
          source={{ uri: urlActual }}
          style={styles.preview}
        />
      ) : (
        <View style={styles.vacio}>
          <MaterialIcons name={iconoVacio} size={32} color={colores.textoSuave} />
          <Text style={styles.vacioTexto}>{textoVacio}</Text>
        </View>
      )}

      <Pressable
        testID={`${prefijoTestID}-libreria`}
        style={styles.boton}
        disabled={deshabilitado}
        onPress={() => onElegir("libreria")}
      >
        <MaterialIcons name="photo-library" size={16} color={colores.acento} />
        <Text style={styles.botonTexto}>Cargar desde librería</Text>
      </Pressable>
      <Pressable
        testID={`${prefijoTestID}-camara`}
        style={styles.boton}
        disabled={deshabilitado}
        onPress={() => onElegir("camara")}
      >
        <MaterialIcons name="photo-camera" size={16} color={colores.acento} />
        <Text style={styles.botonTexto}>Tomar foto con cámara</Text>
      </Pressable>

      {deshabilitado ? <ActivityIndicator /> : null}
      {error ? <Text style={styles.errorTexto}>{error}</Text> : null}
      {mensaje ? <Text style={styles.errorTexto}>{mensaje}</Text> : null}
    </ModalConFooter>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    preview: {
      width: "100%",
      height: 200,
      borderRadius: 12,
      resizeMode: "contain",
      backgroundColor: c.fondo,
    },
    vacio: {
      alignItems: "center",
      gap: 6,
      paddingVertical: 16,
    },
    vacioTexto: { color: c.textoSuave, fontSize: 13 },
    boton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.primario,
      borderRadius: 10,
      paddingVertical: 10,
    },
    botonTexto: { color: c.acento, fontWeight: "600" },
    errorTexto: { color: c.peligro, fontSize: 13, marginTop: 2 },
  });
}
