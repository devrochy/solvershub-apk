import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
 * Avatar de cliente: muestra la foto si existe (fotoUrl) o un círculo con el
 * icono `person`. Si la foto falla al cargar (URL rota o cache viejo), cae al
 * icono por defecto en lugar de dejar un espacio vacío.
 */
export function Avatar({ nombre, fotoUrl, size = 44 }: AvatarProps) {
  const [errorFoto, setErrorFoto] = useState(false);
  const uri = urlArchivo(fotoUrl);

  // Si cambia la URL de la foto (p. ej. el cliente se actualizó), se reinicia
  // el estado de error para intentar cargar la imagen nueva.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset de error al cambiar la URL de la foto
    setErrorFoto(false);
  }, [uri]);

  if (!uri || errorFoto) {
    return (
      <View
        testID="avatar-icono"
        style={[styles.circulo, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <MaterialIcons name="person" size={size * 0.55} color="#2563eb" />
      </View>
    );
  }
  return (
    <Image
      testID="avatar-foto"
      source={{ uri }}
      onError={() => setErrorFoto(true)}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

const styles = StyleSheet.create({
  circulo: {
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
});