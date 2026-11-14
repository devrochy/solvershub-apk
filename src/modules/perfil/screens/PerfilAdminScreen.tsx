import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useAdminSession } from "@core/session/admin-session-context";
import { normalizarPerfil } from "@core/session/types";
import { shSpace, shType } from "@core/theme/tokens";
import {
  apiCambiarPasswordAdmin,
  apiGuardarPerfilAdmin,
  apiQuitarAvatarAdmin,
  apiSubirAvatarAdmin,
} from "@core/api/perfil-admin";
import {
  Avatar,
  Badge,
  Button,
  CampoTelefono,
  Field,
  PageHeader,
  PasswordField,
  TextField,
  useKit,
} from "@shared/ui";
import { prepararAvatar } from "@shared/media/preparar-avatar";

const ROL: Record<string, string> = {
  master: "Master",
  owner: "Dueño",
  propietario: "Propietario",
  gestor: "Gestor",
  colaborador: "Colaborador",
  tester: "Tester",
};

const USUARIO = /^[A-Za-z0-9._-]{3,40}$/;

function rolLabel(rol: string | null | undefined): string {
  if (!rol) return "Usuario";
  return ROL[rol] ?? rol.charAt(0).toUpperCase() + rol.slice(1);
}

function mensajeDeError(error: unknown, respaldo: string): string {
  return error instanceof Error && error.message.trim() ? error.message : respaldo;
}

export function PerfilAdminScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { c } = useKit();
  const { sesion, perfil, refrescarPerfil, aplicarPerfil } = useAdminSession();

  const [nombre, setNombre] = useState(perfil?.nombre ?? "");
  const [telefono, setTelefono] = useState(perfil?.telefono ?? "");
  const [username, setUsername] = useState(perfil?.username ?? "");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [passwordAbierto, setPasswordAbierto] = useState(false);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const editado = useRef(false);

  useEffect(() => {
    let activo = true;
    refrescarPerfil()
      .then((actual) => {
        if (!activo || !actual || editado.current) return;
        setNombre(actual.nombre ?? "");
        setTelefono(actual.telefono ?? "");
        setUsername(actual.username ?? "");
      })
      .catch(() => {
        if (activo) setError("No pudimos actualizar tu perfil. Revisa tu conexión.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [refrescarPerfil]);

  if (!sesion) return null;

  const nombreMostrado = perfil?.nombre?.trim() || perfil?.username || sesion.email;
  const rol = perfil?.role ?? sesion.role;
  const negocio = perfil?.tenantName ?? sesion.tenantName;
  const email = perfil?.email ?? sesion.email;

  const guardar = async () => {
    const usuario = username.trim();
    if (usuario && !USUARIO.test(usuario)) {
      setError("El usuario debe tener entre 3 y 40 caracteres: letras, números, puntos, guiones o guion bajo.");
      return;
    }
    setGuardando(true);
    setError(null);
    setMensaje(null);
    try {
      const me = await apiGuardarPerfilAdmin(sesion, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        username: usuario,
      });
      await aplicarPerfil(me);
      const actualizado = normalizarPerfil(me);
      setNombre(actualizado.nombre ?? "");
      setTelefono(actualizado.telefono ?? "");
      setUsername(actualizado.username ?? "");
      editado.current = false;
      setMensaje("Perfil actualizado.");
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos guardar el perfil."));
    } finally {
      setGuardando(false);
    }
  };

  const elegirFoto = async () => {
    setError(null);
    setMensaje(null);
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
      setSubiendo(true);
      const archivo = await prepararAvatar(asset);
      const me = await apiSubirAvatarAdmin(sesion, archivo);
      await aplicarPerfil(me);
      setMensaje("Foto actualizada.");
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos subir la foto."));
    } finally {
      setSubiendo(false);
    }
  };

  const quitarFoto = async () => {
    setSubiendo(true);
    setError(null);
    setMensaje(null);
    try {
      await apiQuitarAvatarAdmin(sesion);
      await refrescarPerfil();
      setMensaje("Foto quitada.");
    } catch (e) {
      setError(mensajeDeError(e, "No pudimos quitar la foto."));
    } finally {
      setSubiendo(false);
    }
  };

  const cambiarPassword = async () => {
    if (!actual) {
      setPassError("Escribe tu contraseña actual.");
      return;
    }
    if (nueva.length < 8) {
      setPassError("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setPassError("Las contraseñas no coinciden.");
      return;
    }
    setCambiando(true);
    setPassError(null);
    setMensaje(null);
    try {
      await apiCambiarPasswordAdmin(sesion, { actual, nueva });
      setActual("");
      setNueva("");
      setConfirmar("");
      setPasswordAbierto(false);
      setMensaje("Contraseña cambiada.");
    } catch (e) {
      setPassError(mensajeDeError(e, "No pudimos cambiar la contraseña."));
    } finally {
      setCambiando(false);
    }
  };

  return (
    <View testID="perfil-admin" style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <PageHeader
        testID="perfil-header"
        title="Perfil"
        description="Tu cuenta: nombre, contacto, foto, usuario y contraseña."
        onBack={onBack}
      />
      <KeyboardAvoidingView
        style={styles.cuerpo}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          testID="perfil-scroll"
        >
          {cargando ? (
            <View style={styles.cargando} testID="perfil-cargando">
              <ActivityIndicator color={c.link} />
              <Text style={[shType.dense, { color: c.textMuted }]}>Actualizando perfil…</Text>
            </View>
          ) : null}

          {mensaje ? (
            <Text
              testID="perfil-mensaje"
              accessibilityLiveRegion="polite"
              style={[shType.dense, { color: c.statusSuccessFg }]}
            >
              {mensaje}
            </Text>
          ) : null}
          {error ? (
            <Text
              testID="perfil-error"
              accessibilityLiveRegion="polite"
              style={[shType.dense, { color: c.statusDangerFg }]}
            >
              {error}
            </Text>
          ) : null}

          <View style={[styles.tarjeta, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.avatarFila}>
              <Avatar
                testID="perfil-avatar"
                name={nombreMostrado}
                src={perfil?.avatarUrl}
                size="lg"
              />
              <View style={styles.avatarAcciones}>
                <Button
                  testID="perfil-avatar-cambiar"
                  variant="secondary"
                  size="sm"
                  iconLeft="photo-camera"
                  loading={subiendo}
                  onPress={() => void elegirFoto()}
                >
                  Cambiar foto
                </Button>
                {perfil?.avatarUrl ? (
                  <Button
                    testID="perfil-avatar-quitar"
                    variant="ghost"
                    size="sm"
                    iconLeft="delete-outline"
                    disabled={subiendo}
                    onPress={() => void quitarFoto()}
                  >
                    Quitar foto
                  </Button>
                ) : null}
              </View>
            </View>

            <View style={styles.identidad}>
              <Text style={[shType.label, { color: c.text }]} numberOfLines={1}>
                {nombreMostrado}
              </Text>
              <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                {email}
              </Text>
              <View style={styles.etiquetas}>
                <Badge label={rolLabel(rol)} tone={rol === "master" ? "accent" : "neutral"} />
                {negocio ? <Badge label={negocio} /> : null}
              </View>
            </View>
          </View>

          <View style={styles.bloque}>
            <Text style={[shType.block, { color: c.text }]}>Datos personales</Text>
            <Field label="Nombre completo">
              <TextField
                testID="perfil-nombre"
                value={nombre}
                onChangeText={(valor) => {
                  editado.current = true;
                  setNombre(valor);
                }}
                placeholder="Nombre y apellido"
                autoCapitalize="words"
                autoComplete="name"
              />
            </Field>
            <Field label="Correo" hint="El correo no se puede cambiar.">
              <TextField testID="perfil-email" value={email} disabled />
            </Field>
            <Field label="Teléfono">
              <CampoTelefono
                testID="perfil-telefono"
                valor={telefono}
                onChange={(valor) => {
                  editado.current = true;
                  setTelefono(valor);
                }}
              />
            </Field>
            <Field label="Usuario">
              <TextField
                testID="perfil-usuario"
                value={username}
                onChangeText={(valor) => {
                  editado.current = true;
                  setUsername(valor);
                }}
                placeholder="usuario"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>
            <Button
              testID="perfil-guardar"
              fullWidth
              loading={guardando}
              onPress={() => void guardar()}
            >
              Guardar cambios
            </Button>
          </View>

          <View style={styles.bloque}>
            <Text style={[shType.block, { color: c.text }]}>Contraseña</Text>
            <Button
              testID="perfil-password-toggle"
              variant="secondary"
              size="sm"
              iconLeft="lock"
              onPress={() => {
                setPasswordAbierto((valor) => !valor);
                setPassError(null);
              }}
            >
              {passwordAbierto ? "Cancelar" : "Cambiar contraseña"}
            </Button>
            {passwordAbierto ? (
              <>
                <Field label="Contraseña actual" required>
                  <PasswordField
                    testID="perfil-password-actual"
                    value={actual}
                    onChangeText={setActual}
                    placeholder="Tu contraseña actual"
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="Contraseña nueva" required>
                  <PasswordField
                    testID="perfil-password-nueva"
                    value={nueva}
                    onChangeText={setNueva}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Repite la contraseña nueva" required>
                  <PasswordField
                    testID="perfil-password-confirmar"
                    value={confirmar}
                    onChangeText={setConfirmar}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                  />
                </Field>
                {passError ? (
                  <Text
                    testID="perfil-password-error"
                    accessibilityLiveRegion="polite"
                    style={[shType.dense, { color: c.statusDangerFg }]}
                  >
                    {passError}
                  </Text>
                ) : null}
                <Button
                  testID="perfil-password-guardar"
                  fullWidth
                  loading={cambiando}
                  disabled={!actual || !nueva || !confirmar}
                  onPress={() => void cambiarPassword()}
                >
                  Guardar contraseña
                </Button>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cuerpo: { flex: 1 },
  contenido: {
    paddingHorizontal: shSpace[4],
    paddingBottom: shSpace[8],
    gap: shSpace[4],
  },
  cargando: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  tarjeta: {
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: "continuous",
    padding: shSpace[4],
    gap: shSpace[4],
  },
  avatarFila: { flexDirection: "row", alignItems: "center", gap: shSpace[4] },
  avatarAcciones: { flex: 1, gap: shSpace[2], alignItems: "flex-start" },
  identidad: { gap: 2 },
  etiquetas: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2], marginTop: shSpace[1] },
  bloque: { gap: shSpace[3] },
});
