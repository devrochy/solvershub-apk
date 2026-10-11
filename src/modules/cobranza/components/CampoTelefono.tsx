import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { useKit, type KitTema } from "@shared/ui";
import {
  PAISES_TELEFONO,
  PAIS_DEFECTO_TELEFONO,
  paisDesdeTelefono,
  type PaisTelefono,
} from "@shared/domain/paises-telefono";

export interface CampoTelefonoProps {
  /** Número completo internacional (p. ej. "+5917000111") o vacío. */
  valor: string;
  onChange(nuevoValor: string): void;
  testID?: string;
  placeholder?: string;
}

/**
 * Campo de teléfono con prefijo internacional: un botón con la bandera del
 * país seleccionado abre la lista de países (bandera + prefijo) y un input
 * recibe solo el número local. El valor que se emite es siempre el número
 * completo internacional (prefijo + número).
 */
export function CampoTelefono({
  valor,
  onChange,
  testID = "campo-telefono",
  placeholder = "Número",
}: CampoTelefonoProps) {
  const [listaAbierta, setListaAbierta] = useState(false);
  const [paisSeleccionado, setPaisSeleccionado] = useState<PaisTelefono | null>(
    null,
  );
  const kit = useKit();
  const { c } = kit;
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  // Fuente de verdad: el país explícitamente elegido; si no se ha elegido uno,
  // se infiere del número (y ante prefijos compartidos +1 se resuelve al país
  // con el prefijo más largo que coincida, o al primero del catálogo).
  const pais = paisSeleccionado ?? paisDesdeTelefono(valor) ?? PAIS_DEFECTO_TELEFONO;

  const numeroLocal = valor.startsWith(pais.prefijo)
    ? valor.slice(pais.prefijo.length)
    : valor;

  function seleccionarPais(nuevoPais: PaisTelefono) {
    setListaAbierta(false);
    setPaisSeleccionado(nuevoPais);
    const local = valor.startsWith(nuevoPais.prefijo)
      ? valor.slice(nuevoPais.prefijo.length)
      : numeroLocal.replace(/^\+\d{1,4}/, "");
    onChange(`${nuevoPais.prefijo}${local}`);
  }

  return (
    <View style={styles.contenedor}>
      <Pressable
        testID={`${testID}-pais`}
        style={styles.botonPais}
        onPress={() => setListaAbierta(true)}
      >
        <Text style={styles.bandera}>{pais.bandera}</Text>
        <Text style={styles.prefijo}>{pais.prefijo}</Text>
        <MaterialIcons name="arrow-drop-down" size={20} color={c.textMuted} />
      </Pressable>
      <TextInput
        testID={`${testID}-numero`}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={c.textSoft}
        keyboardType="phone-pad"
        value={numeroLocal}
        onChangeText={(local) => onChange(`${pais.prefijo}${local}`)}
      />

      <Modal visible={listaAbierta} animationType="slide" transparent onRequestClose={() => setListaAbierta(false)}>
        <View style={styles.fondo}>
          <View style={styles.carta}>
            <View style={styles.header}>
              <Text style={styles.headerTitulo}>Selecciona el país</Text>
              <Pressable
                testID={`${testID}-cerrar-lista`}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={10}
                style={styles.cerrar}
                onPress={() => setListaAbierta(false)}
              >
                <MaterialIcons name="close" size={22} color={kit.banda.texto} />
              </Pressable>
            </View>
            <FlatList
              data={PAISES_TELEFONO}
              keyExtractor={(p) => p.codigo}
              renderItem={({ item }) => (
                <Pressable
                  testID={`${testID}-pais-${item.codigo}`}
                  style={styles.filaPais}
                  onPress={() => seleccionarPais(item)}
                >
                  <Text style={styles.bandera}>{item.bandera}</Text>
                  <Text style={styles.nombrePais}>{item.nombre}</Text>
                  <Text style={styles.prefijoFila}>{item.prefijo}</Text>
                  {item.codigo === pais.codigo ? (
                    <MaterialIcons name="check" size={18} color={c.statusSuccessFg} />
                  ) : null}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function crearEstilos({ c, banda }: KitTema) {
  return StyleSheet.create({
    contenedor: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
    botonPais: {
      flexDirection: "row",
      alignItems: "center",
      gap: shSpace[1],
      minHeight: shDensity.controlLg,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: shRadius.sm,
      paddingHorizontal: 10,
      backgroundColor: c.surface,
    },
    bandera: { fontSize: 18 },
    prefijo: { ...shType.label, color: c.text },
    input: {
      ...shType.body,
      flex: 1,
      minHeight: shDensity.controlLg,
      borderWidth: 1,
      borderColor: c.controlBorder,
      borderRadius: shRadius.sm,
      paddingHorizontal: shSpace[3],
      paddingVertical: shSpace[2],
      color: c.text,
      backgroundColor: c.surface,
    },
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
      maxHeight: "70%",
      paddingBottom: shSpace[6],
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingLeft: shSpace[4],
      paddingRight: shSpace[1],
      paddingVertical: shSpace[1],
      backgroundColor: banda.fondo,
    },
    headerTitulo: { ...shType.block, color: banda.texto },
    cerrar: {
      minWidth: shDensity.controlLg,
      minHeight: shDensity.controlLg,
      alignItems: "center",
      justifyContent: "center",
    },
    filaPais: {
      flexDirection: "row",
      alignItems: "center",
      gap: shSpace[3],
      minHeight: shDensity.rowComfortable,
      paddingHorizontal: shSpace[4],
      paddingVertical: shSpace[3],
      borderBottomWidth: 1,
      borderBottomColor: c.borderSoft,
    },
    nombrePais: { ...shType.body, flex: 1, color: c.text },
    prefijoFila: { ...shType.label, color: c.textMuted },
  });
}
