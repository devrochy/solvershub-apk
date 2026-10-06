import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { urlArchivo } from "@core/config";
import { useTheme } from "@core/theme/theme-context";

export interface AvatarProps {
  nombre: string;
  fotoUrl?: string | null;
  size?: number;
  /** Fondo del círculo cuando no hay foto (default: `activoSuave`). */
  fondo?: string;
  /** Color del icono `person` del fallback (default: `acento`). */
  colorIcono?: string;
  /** Anillo alrededor del avatar, tanto en fallback como en foto. */
  bordeColor?: string;
}

/**
 * Avatar de cliente: muestra la foto si existe (fotoUrl) o un círculo con el
 * icono `person`. Si la foto falla al cargar (URL rota o cache viejo), cae al
 * icono por defecto en lugar de dejar un espacio vacío. Los colores opcionales
 * permiten integrarlo sobre fondos de color (p. ej. la tarjeta azul del menú).
 */
export function Avatar({
  nombre,
  fotoUrl,
  size = 44,
  fondo,
  colorIcono,
  bordeColor,
}: AvatarProps) {
  const { colores } = useTheme();
  const [errorFoto, setErrorFoto] = useState(false);
  const uri = urlArchivo(fotoUrl);
  const anillo = bordeColor ? { borderWidth: 2, borderColor: bordeColor } : null;

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
        style={[
          styles.circulo,
          {
            backgroundColor: fondo ?? colores.activoSuave,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          anillo,
        ]}
      >
        <MaterialIcons name="person" size={size * 0.55} color={colorIcono ?? colores.acento} />
      </View>
    );
  }
  return (
    <Image
      testID="avatar-foto"
      source={{ uri }}
      onError={() => setErrorFoto(true)}
      style={[{ width: size, height: size, borderRadius: size / 2 }, anillo]}
    />
  );
}

const styles = StyleSheet.create({
  circulo: {
    alignItems: "center",
    justifyContent: "center",
  },
});