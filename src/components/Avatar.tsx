import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { urlArchivo } from "../config";

export interface AvatarProps {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
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
        <MaterialIcons name="person" size={size * 0.55} color="#172f6c" />
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