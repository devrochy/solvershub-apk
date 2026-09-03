import { useState } from "react";
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
import {
  PAISES_TELEFONO,
  PAIS_DEFECTO_TELEFONO,
  paisDesdeTelefono,
  type PaisTelefono,
} from "../domain/paises-telefono";

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
  const pais = paisDesdeTelefono(valor) ?? PAIS_DEFECTO_TELEFONO;

  const numeroLocal = valor.startsWith(pais.prefijo)
    ? valor.slice(pais.prefijo.length)
    : valor;

  function seleccionarPais(nuevoPais: PaisTelefono) {
    setListaAbierta(false);
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
        <MaterialIcons name="arrow-drop-down" size={20} color="#64748b" />
      </Pressable>
      <TextInput
        testID={`${testID}-numero`}
        style={styles.input}
        placeholder={placeholder}
        keyboardType="phone-pad"
        value={numeroLocal}
        onChangeText={(local) => onChange(`${pais.prefijo}${local}`)}
      />

      <Modal visible={listaAbierta} animationType="slide" transparent onRequestClose={() => setListaAbierta(false)}>
        <View style={styles.fondo}>
          <View style={styles.carta}>
            <View style={styles.header}>
              <Text style={styles.headerTitulo}>Selecciona el país</Text>
              <Pressable testID={`${testID}-cerrar-lista`} onPress={() => setListaAbierta(false)}>
                <MaterialIcons name="close" size={22} color="#475569" />
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
                    <MaterialIcons name="check" size={18} color="#16a34a" />
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

const styles = StyleSheet.create({
  contenedor: { flexDirection: "row", alignItems: "center", gap: 8 },
  botonPais: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  bandera: { fontSize: 18 },
  prefijo: { fontSize: 15, fontWeight: "600", color: "#334155" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  fondo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  carta: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitulo: { fontSize: 16, fontWeight: "700", color: "#334155" },
  filaPais: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  nombrePais: { flex: 1, fontSize: 15, color: "#334155" },
  prefijoFila: { fontSize: 15, color: "#64748b", fontWeight: "600" },
});