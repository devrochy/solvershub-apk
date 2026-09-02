import { Image, StyleSheet, Text, View } from "react-native";
import { urlArchivo } from "../config";

export interface AvatarProps {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
}

/** Iniciales del nombre (primeras letras de la primera y última palabra). */
export function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) {
    return "?";
  }
  const primera = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] ?? "" : "";
  return `${primera}${ultima}`.toUpperCase();
}

/**
 * Avatar de cliente: muestra la foto si existe (fotoUrl) o un círculo con las
 * iniciales del nombre (A10).
 */
export function Avatar({ nombre, fotoUrl, size = 44 }: AvatarProps) {
  const uri = urlArchivo(fotoUrl);
  if (uri) {
    return (
      <Image
        testID="avatar-foto"
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      testID="avatar-iniciales"
      style={[styles.circulo, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.texto, { fontSize: size * 0.4 }]}>{inicialesDe(nombre)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  texto: { color: "#2563eb", fontWeight: "700" },
});