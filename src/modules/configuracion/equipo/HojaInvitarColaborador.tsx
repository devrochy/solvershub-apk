import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { AdminApiError, type ClienteAdmin } from "@core/api/admin";
import {
  Button,
  CampoTelefono,
  Field,
  Icono,
  PasswordField,
  RadioGroup,
  Sheet,
  TextField,
  useKit,
} from "@shared/ui";
import {
  cargarPackRoles,
  crearColaborador,
  emailExiste,
  invitarPorCorreo,
  usernameDisponible,
  type PackRole,
} from "../api";
import {
  esLimiteDePlan,
  mensajeDeAlta,
  validarEmail,
  validarPassword,
  validarUsername,
} from "./dominio";

type Paso = "email" | "perfil";
type EstadoUsername = "idle" | "checking" | "libre" | "ocupado" | "invalido";

interface OpcionRol {
  rol: string;
  packRoles: string[];
}

/**
 * Alta de colaborador en dos pasos, como el panel (D-SPEC-34): se escribe el
 * correo y, si la cuenta ya existe, se envía una invitación; si no, se crea el
 * perfil completo (nombre, teléfono, usuario, contraseña y rol).
 */
export function HojaInvitarColaborador({
  visible,
  api,
  esMaster,
  tenantName,
  onClose,
  onCreado,
}: {
  visible: boolean;
  api: ClienteAdmin;
  esMaster: boolean;
  tenantName?: string | null;
  onClose: () => void;
  onCreado: (mensaje: string) => void;
}) {
  const { c, tonos } = useKit();
  const [paso, setPaso] = useState<Paso>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [existe, setExiste] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [estadoUsername, setEstadoUsername] = useState<EstadoUsername>("idle");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState("colaborador");
  const [packRoles, setPackRoles] = useState<PackRole[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [limite, setLimite] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    let activo = true;
    cargarPackRoles(api)
      .then((roles) => {
        if (activo) setPackRoles(roles);
      })
      .catch(() => {
        if (activo) setPackRoles([]);
      });
    return () => {
      activo = false;
    };
  }, [visible, api]);

  useEffect(() => {
    if (!visible || paso !== "perfil" || existe) return;
    const limpio = username.trim();
    if (!limpio || validarUsername(limpio)) return;
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      usernameDisponible(api, limpio)
        .then((libre) => setEstadoUsername(libre ? "libre" : "ocupado"))
        .catch(() => setEstadoUsername("idle"));
    }, 350);
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, [visible, paso, existe, username, api]);

  function cambiarUsername(valor: string) {
    setUsername(valor);
    const limpio = valor.trim();
    if (!limpio) {
      setEstadoUsername("idle");
      return;
    }
    if (validarUsername(limpio)) {
      setEstadoUsername("invalido");
      return;
    }
    setEstadoUsername("checking");
  }

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  function reiniciar() {
    setPaso("email");
    setEmail("");
    setEmailError(null);
    setExiste(false);
    setNombre("");
    setUsername("");
    setEstadoUsername("idle");
    setPassword("");
    setTelefono("");
    setRol("colaborador");
    setError(null);
    setLimite(null);
    setEnviando(false);
  }

  function cerrar() {
    reiniciar();
    onClose();
  }

  async function continuar() {
    const invalido = validarEmail(email);
    if (invalido) {
      setEmailError(invalido);
      return;
    }
    setEmailError(null);
    setError(null);
    setVerificando(true);
    try {
      setExiste(await emailExiste(api, email.trim()));
      setPaso("perfil");
    } catch {
      setEmailError("No pudimos verificar el correo. Inténtalo de nuevo.");
    } finally {
      setVerificando(false);
    }
  }

  function seleccionDeRol(valor: string): OpcionRol {
    if (valor === "master") return { rol: "master", packRoles: [] };
    if (valor.startsWith("pack:")) {
      return { rol: "colaborador", packRoles: [valor.slice("pack:".length)] };
    }
    return { rol: "colaborador", packRoles: [] };
  }

  async function enviar() {
    const rolElegido = seleccionDeRol(rol);
    setError(null);
    setLimite(null);

    if (!existe) {
      const errorNombre = nombre.trim() ? null : "Escribe el nombre completo.";
      const errorUsuario = validarUsername(username) ?? (estadoUsername === "ocupado" ? "Ese usuario ya está en uso." : null);
      const errorPassword = validarPassword(password);
      if (errorNombre || errorUsuario || errorPassword) {
        setError(errorNombre ?? errorUsuario ?? errorPassword);
        return;
      }
    }

    setEnviando(true);
    try {
      if (existe) {
        await invitarPorCorreo(api, {
          email: email.trim(),
          role: rolElegido.rol,
          pack_roles: rolElegido.packRoles,
        });
        onCreado("Invitación enviada.");
      } else {
        const res = await crearColaborador(api, {
          email: email.trim(),
          password,
          role: rolElegido.rol,
          username: username.trim(),
          nombre: nombre.trim(),
          telefono,
          pack_roles: rolElegido.packRoles,
        });
        onCreado(mensajeDeAlta(res.resultado));
      }
      cerrar();
    } catch (e) {
      if (e instanceof AdminApiError && esLimiteDePlan(e.code)) {
        setLimite(e.message || "Llegaste al tope de colaboradores de tu plan.");
      } else {
        setError(e instanceof Error && e.message ? e.message : "No pudimos guardar. Revisa los datos.");
      }
    } finally {
      setEnviando(false);
    }
  }

  const opcionesRol = [
    {
      value: "colaborador",
      label: "Colaborador",
      description: "Gestiona el negocio según sus permisos",
    },
    ...packRoles.map((p) => ({
      value: `pack:${p.value}`,
      label: p.label,
      description: "Rol de habilidad del pack",
    })),
    ...(esMaster
      ? [
          {
            value: "master",
            label: "Master",
            description: "Administra la plataforma",
          },
        ]
      : []),
  ];

  const puedeEnviar =
    !enviando &&
    (existe ||
      (nombre.trim().length > 0 &&
        estadoUsername === "libre" &&
        password.length >= 8));

  return (
    <Sheet
      visible={visible}
      onClose={cerrar}
      title="Nuevo colaborador"
      description={
        paso === "email"
          ? "Si la persona ya tiene cuenta, la invitamos; si no, la creamos."
          : existe
            ? "Ese correo ya tiene cuenta. Elige su rol y envíale la invitación."
            : tenantName
              ? `El negocio es ${tenantName}.`
              : "Completa el perfil del colaborador."
      }
      testID="hoja-invitar"
      footer={
        <View style={styles.pie}>
          <View style={styles.pieBoton}>
            <Button
              variant="ghost"
              fullWidth
              onPress={() => {
                if (paso === "email") {
                  cerrar();
                } else {
                  setPaso("email");
                  setError(null);
                  setLimite(null);
                }
              }}
            >
              {paso === "email" ? "Cancelar" : "Volver"}
            </Button>
          </View>
          <View style={styles.pieBoton}>
            {paso === "email" ? (
              <Button
                testID="invitar-continuar"
                fullWidth
                loading={verificando}
                onPress={() => void continuar()}
              >
                Continuar
              </Button>
            ) : (
              <Button
                testID="invitar-enviar"
                fullWidth
                loading={enviando}
                disabled={!puedeEnviar}
                onPress={() => void enviar()}
              >
                {existe ? "Enviar invitación" : "Crear colaborador"}
              </Button>
            )}
          </View>
        </View>
      }
    >
      <View style={styles.pasos}>
        <Text style={[shType.caption, { color: paso === "email" ? c.link : c.textMuted }]}>1 · Correo</Text>
        <Icono name="arrow-forward" size={14} color={c.textSoft} />
        <Text style={[shType.caption, { color: paso === "perfil" ? c.link : c.textMuted }]}>
          2 · {existe ? "Invitación" : "Perfil"}
        </Text>
      </View>

      {paso === "email" ? (
        <>
          <Field
            label="Correo"
            required
            error={emailError}
            hint="Con este correo entrará al panel."
          >
            <TextField
              testID="invitar-email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              placeholder="ana@correo.com"
            />
          </Field>
        </>
      ) : (
        <>
          {existe ? (
            <View
              style={[
                styles.aviso,
                { backgroundColor: tonos.warning.bg, borderColor: tonos.warning.border },
              ]}
            >
              <Icono name="mail" size={18} color={tonos.warning.fg} />
              <Text style={[shType.dense, styles.avisoTexto, { color: tonos.warning.fg }]}>
                Ya existe una cuenta con este correo. Le enviaremos una invitación para que acepte entrar a tu negocio.
              </Text>
            </View>
          ) : (
            <>
              <Field label="Nombre completo" required>
                <TextField
                  testID="invitar-nombre"
                  value={nombre}
                  onChangeText={setNombre}
                  autoComplete="name"
                  placeholder="Nombre y apellido"
                />
              </Field>
              <Field label="Teléfono" hint="Con indicativo; es opcional.">
                <CampoTelefono valor={telefono} onChange={setTelefono} testID="invitar-telefono" />
              </Field>
            </>
          )}

          <View style={styles.campoRol}>
            <Text style={[shType.label, { color: c.text }]}>Rol</Text>
            <RadioGroup
              label="Rol"
              options={opcionesRol}
              value={rol}
              onValueChange={setRol}
              testID="invitar-rol"
            />
          </View>

          {!existe ? (
            <>
              <Field
                label="Usuario"
                required
                hint="Único y sin espacios."
                error={
                  estadoUsername === "ocupado"
                    ? "Ese usuario ya está en uso."
                    : estadoUsername === "invalido"
                      ? "Mínimo 3 caracteres: letras, números, puntos, guiones."
                      : undefined
                }
              >
                <View>
                  <TextField
                    testID="invitar-username"
                    value={username}
                    onChangeText={cambiarUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="ana.perez"
                    style={styles.campoConIcono}
                  />
                  <View style={styles.iconoEstado}>
                    {estadoUsername === "checking" ? <ActivityIndicator size="small" color={c.textMuted} /> : null}
                    {estadoUsername === "libre" ? (
                      <Icono name="check-circle" size={18} color={tonos.success.fg} />
                    ) : null}
                    {estadoUsername === "ocupado" ? (
                      <Icono name="cancel" size={18} color={tonos.danger.fg} />
                    ) : null}
                  </View>
                </View>
                {estadoUsername === "libre" ? (
                  <Text style={[shType.caption, { color: tonos.success.fg }]}>Disponible</Text>
                ) : null}
              </Field>
              <Field label="Contraseña" required hint="Mínimo 8 caracteres.">
                <PasswordField
                  testID="invitar-password"
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                />
              </Field>
            </>
          ) : null}

          {limite ? (
            <View
              testID="invitar-limite"
              style={[styles.aviso, { backgroundColor: tonos.warning.bg, borderColor: tonos.warning.border }]}
            >
              <Icono name="info-outline" size={18} color={tonos.warning.fg} />
              <Text style={[shType.dense, styles.avisoTexto, { color: tonos.warning.fg }]}>{limite}</Text>
            </View>
          ) : null}

          {error ? (
            <Text
              testID="invitar-error"
              accessibilityLiveRegion="polite"
              style={[shType.dense, { color: tonos.danger.fg }]}
            >
              {error}
            </Text>
          ) : null}
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pasos: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
  },
  campoRol: { gap: shSpace[1] },
  campoConIcono: { paddingRight: 44 },
  iconoEstado: {
    position: "absolute",
    right: shSpace[3],
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[3],
  },
  avisoTexto: { flex: 1 },
  pie: {
    flexDirection: "row",
    gap: shSpace[2],
    flex: 1,
  },
  pieBoton: { flex: 1 },
});
