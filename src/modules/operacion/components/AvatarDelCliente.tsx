import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { shSpace } from "@core/theme/tokens";
import { useAdminSession } from "@core/session/admin-session-context";
import { urlAvatarCliente } from "@shared/domain/formato-clientes";
import { prepararAvatar } from "@shared/media/preparar-avatar";
import { Avatar, IconButton, useKit } from "@shared/ui";
import {
  quitarAvatarDelCliente,
  subirAvatarDelCliente,
  type FichaDelCliente,
} from "../api";

/**
 * Avatar central de la ficha con cambio de foto: elige una imagen, la reduce a
 * 512 px y la sube al almacenamiento del negocio. Sin permiso de escritura solo
 * muestra la foto o las iniciales.
 */
export function AvatarDelCliente({
  id,
  nombre,
  avatarUrl,
  puedeEscribir,
  onCambio,
  onQuitado,
}: {
  id: string;
  nombre: string;
  avatarUrl?: string | null;
  puedeEscribir: boolean;
  onCambio: (ficha: FichaDelCliente) => void;
  onQuitado: () => void;
}) {
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const [preview, setPreview] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const elegirFoto = async () => {
    if (!sesion || !puedeEscribir || subiendo) return;
    setError(null);
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setError("Se necesita permiso para acceder a tus fotos.");
        return;
      }
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      const asset = resultado.canceled ? undefined : resultado.assets[0];
      if (!asset) return;
      setPreview(asset.uri);
      setSubiendo(true);
      const archivo = await prepararAvatar(asset);
      const ficha = await subirAvatarDelCliente(sesion, id, archivo);
      setPreview(null);
      onCambio(ficha);
    } catch {
      setPreview(null);
      setError("No pudimos subir la foto. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  };

  const quitarFoto = async () => {
    if (!sesion || !puedeEscribir || subiendo) return;
    setError(null);
    setSubiendo(true);
    try {
      await quitarAvatarDelCliente(sesion, id);
      setPreview(null);
      onQuitado();
    } catch {
      setError("No pudimos quitar la foto.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.avatar}>
        <Avatar
          testID="cliente-avatar"
          name={nombre}
          src={preview ?? urlAvatarCliente(avatarUrl)}
          size="2xl"
        />
        {subiendo ? (
          <View style={[styles.cargando, { backgroundColor: c.overlay }]}>
            <ActivityIndicator color={c.link} />
          </View>
        ) : null}
        {puedeEscribir ? (
          <>
            <View style={[styles.accion, styles.camara, { backgroundColor: c.surface, borderColor: c.border }]}>
              <IconButton
                testID="cliente-avatar-cambiar"
                icon="photo-camera"
                label={`Cambiar la foto de ${nombre}`}
                size="sm"
                tone="accent"
                disabled={subiendo}
                onPress={() => void elegirFoto()}
              />
            </View>
            {avatarUrl || preview ? (
              <View style={[styles.accion, styles.quitar, { backgroundColor: c.surface, borderColor: c.border }]}>
                <IconButton
                  testID="cliente-avatar-quitar"
                  icon="delete-outline"
                  label={`Quitar la foto de ${nombre}`}
                  size="sm"
                  tone="danger"
                  disabled={subiendo}
                  onPress={() => void quitarFoto()}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
      {error ? (
        <Text style={[styles.error, { color: c.statusDangerFg }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: "center", gap: shSpace[1] },
  avatar: { position: "relative" },
  cargando: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  accion: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  camara: { right: -6, bottom: 4 },
  quitar: { left: -6, bottom: 4 },
  error: { fontSize: 12, textAlign: "center" },
});
