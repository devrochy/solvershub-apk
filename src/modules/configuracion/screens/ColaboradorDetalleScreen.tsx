import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { AdminApiError } from "@core/api/admin";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import {
  Avatar,
  Badge,
  Button,
  Field,
  IconButton,
  Icono,
  PageHeader,
  PasswordField,
  RadioGroup,
  Sheet,
  Skeleton,
  Switch,
  useKit,
  type IconName,
} from "@shared/ui";
import { notificarCambioEquipo } from "@shared/equipo-evento";
import {
  alternarColaborador,
  cargarPermisosColaborador,
  desvincularNegocio,
  guardarPermisosColaborador,
  restablecerPasswordColaborador,
  type CollaboratorItem,
  type PermissionState,
} from "../api";
import {
  puedeActuarSobre,
  rolLabel,
  seccionLabel,
  seccionesOtorgables,
  validarPassword,
  type Acceso,
} from "../equipo/dominio";
import { HojaVincularNegocio } from "../equipo/HojaVincularNegocio";
import { SelectorAcceso } from "../equipo/SelectorAcceso";

type Vinculo = CollaboratorItem["links"][number];

interface EstadoPermiso {
  access: Acceso;
  heredado: boolean;
}

function accesoDe(access: string): Acceso {
  return access === "write" || access === "none" ? access : "read";
}

/**
 * Ficha de una cuenta del equipo (Cuenta › Equipo → tarjeta). Reúne lo mismo
 * que el panel: contacto, estado, contraseña, grilla de permisos por sección y
 * negocios vinculados. El master elige el negocio de los permisos y puede
 * vincular cuentas a otros negocios.
 */
export function ColaboradorDetalleScreen({
  colaborador,
  onBack,
}: {
  colaborador: CollaboratorItem;
  onBack: () => void;
}) {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const insets = useSafeAreaInsets();
  const esMaster = sesion?.role === "master";
  const puedeGestionar = esMaster || sesion?.permissions?.collaborators === "write";
  const puedeActuar = puedeGestionar && puedeActuarSobre(colaborador, esMaster);
  const nombre = colaborador.nombre || colaborador.email;
  const rol = colaborador.is_platform_master ? "Master" : rolLabel(colaborador.role);

  const [activo, setActivo] = useState(colaborador.active);
  const [links, setLinks] = useState<Vinculo[]>(colaborador.links);
  const [permisos, setPermisos] = useState<Record<string, EstadoPermiso>>({});
  const [secciones, setSecciones] = useState<string[]>([]);
  const [negocio, setNegocio] = useState("");
  const [negocioAbierto, setNegocioAbierto] = useState(false);
  const [cargandoPermisos, setCargandoPermisos] = useState(true);
  const [errorPermisos, setErrorPermisos] = useState<string | null>(null);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  const [passwordAbierto, setPasswordAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [vincularAbierto, setVincularAbierto] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarPermisos = useCallback(async () => {
    setCargandoPermisos(true);
    setErrorPermisos(null);
    try {
      const items: PermissionState[] = await cargarPermisosColaborador(
        api,
        colaborador.id,
        esMaster ? negocio : "",
      );
      const mapa: Record<string, EstadoPermiso> = {};
      for (const item of items) {
        mapa[item.section] = { access: accesoDe(item.access), heredado: item.heredado };
      }
      setPermisos(mapa);
      setSecciones(
        esMaster
          ? Object.keys(mapa).sort()
          : seccionesOtorgables(sesion?.permissions, false),
      );
    } catch {
      setErrorPermisos("No pudimos cargar los permisos. Revisa tu conexión.");
    } finally {
      setCargandoPermisos(false);
    }
  }, [api, colaborador.id, esMaster, negocio, sesion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial y al cambiar de negocio
    void cargarPermisos();
  }, [cargarPermisos]);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(null), 4500);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  const aplicarActivo = async (nuevo: boolean) => {
    setCambiandoEstado(true);
    setError(null);
    try {
      await alternarColaborador(api, colaborador.id);
      setActivo(nuevo);
      setMensaje(nuevo ? "Colaborador activado." : "Colaborador desactivado.");
      notificarCambioEquipo();
    } catch {
      setError("No pudimos cambiar el estado de la cuenta.");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const cambiarActivo = (nuevo: boolean) => {
    if (!nuevo) {
      Alert.alert(
        "Desactivar colaborador",
        "Quedará sin acceso y sus permisos dejarán de aplicar hasta que lo reactives. Libera su cupo de colaboradores del plan.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Desactivar",
            style: "destructive",
            onPress: () => void aplicarActivo(false),
          },
        ],
      );
      return;
    }
    void aplicarActivo(true);
  };

  const cambiarPassword = async () => {
    const invalido = validarPassword(password);
    if (invalido) {
      setPasswordError(invalido);
      return;
    }
    setPasswordError(null);
    setCambiandoPassword(true);
    setError(null);
    try {
      await restablecerPasswordColaborador(api, colaborador.id, password);
      setPassword("");
      setPasswordAbierto(false);
      setMensaje("Contraseña cambiada. Se cerraron las sesiones abiertas de esa cuenta.");
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.message
          ? e.message
          : "No pudimos cambiar la contraseña.",
      );
    } finally {
      setCambiandoPassword(false);
    }
  };

  const guardarPermisos = async () => {
    if (secciones.length === 0) return;
    setGuardandoPermisos(true);
    setError(null);
    try {
      const mapa = Object.fromEntries(
        secciones.map((seccion) => [seccion, permisos[seccion]?.access ?? "none"]),
      );
      await guardarPermisosColaborador(api, colaborador.id, esMaster ? negocio : "", mapa);
      setMensaje("Permisos guardados.");
      notificarCambioEquipo();
      await cargarPermisos();
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.message
          ? e.message
          : "No pudimos guardar los permisos.",
      );
    } finally {
      setGuardandoPermisos(false);
    }
  };

  const confirmarDesvincular = (link: Vinculo) => {
    Alert.alert(
      `Desvincular de ${link.name}`,
      "La cuenta deja de ver ese negocio y sus permisos ahí dejan de aplicar. Para volver, habrá que vincularla de nuevo.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desvincular",
          style: "destructive",
          onPress: () => {
            void desvincularNegocio(api, colaborador.id, link.slug)
              .then(() => {
                setLinks((previos) => previos.filter((l) => l.slug !== link.slug));
                if (negocio === link.slug) setNegocio("");
                setMensaje(`Cuenta desvinculada de ${link.name}.`);
                notificarCambioEquipo();
              })
              .catch((e) =>
                setError(
                  e instanceof AdminApiError && e.message
                    ? e.message
                    : "No pudimos desvincular la cuenta.",
                ),
              );
          },
        },
      ],
    );
  };

  const opcionesNegocio = [
    {
      value: "",
      label: "Global (todos los negocios)",
      description: "Aplica a todos los negocios vinculados",
    },
    ...links.map((link) => ({
      value: link.slug,
      label: link.name,
      description: rolLabel(link.role),
    })),
  ];
  const nombreNegocio =
    negocio === "" ? "Global (todos los negocios)" : links.find((l) => l.slug === negocio)?.name ?? negocio;

  return (
    <View
      testID="colaborador-detalle"
      style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top }]}
    >
      <PageHeader
        testID="colaborador-header"
        title={nombre}
        description={colaborador.nombre ? colaborador.email : `${rol}${colaborador.is_self ? " · tú" : ""}`}
        onBack={onBack}
      />

      <ScrollView
        testID="colaborador-scroll"
        contentContainerStyle={[
          styles.contenido,
          { paddingBottom: insets.bottom + shSpace[8] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {mensaje ? <Aviso tono="success" icono="check-circle" texto={mensaje} testID="colaborador-mensaje" /> : null}
        {error ? <Aviso tono="danger" icono="error-outline" texto={error} testID="colaborador-error" /> : null}
        {!puedeGestionar ? (
          <Aviso
            tono="warning"
            icono="lock-outline"
            texto="Solo lectura: no tienes permiso para gestionar a esta persona."
            testID="colaborador-solo-lectura"
          />
        ) : null}

        <View style={[styles.tarjeta, { backgroundColor: c.surface, borderColor: c.borderSoft }]}>
          <View style={styles.contactoFila}>
            <Avatar
              name={nombre}
              src={colaborador.avatar_url}
              size="lg"
              status={{
                tone: activo ? "success" : "neutral",
                label: activo ? "Activa" : "Inactiva",
              }}
            />
            <View style={styles.contactoTextos}>
              <View style={styles.nombreFila}>
                <Text style={[shType.block, styles.nombre, { color: c.text }]} numberOfLines={1}>
                  {nombre}
                </Text>
                {colaborador.is_self ? <Badge label="tú" tone="neutral" /> : null}
              </View>
              <Text style={[shType.dense, { color: c.textMuted }]} numberOfLines={1}>
                {colaborador.nombre ? colaborador.email : colaborador.username ? `@${colaborador.username}` : "Sin usuario"}
              </Text>
              <View style={styles.badges}>
                <Badge
                  label={rol}
                  tone={colaborador.is_platform_master ? "accent" : "neutral"}
                />
                <Badge
                  label={activo ? "Activa" : "Inactiva"}
                  tone={activo ? "success" : "neutral"}
                  icon={activo ? "check-circle" : "block"}
                  testID="colaborador-estado-badge"
                />
              </View>
            </View>
          </View>

          <View style={[styles.datos, { borderTopColor: c.borderSoft }]}>
            <Dato icono="alternate-email" etiqueta="Usuario" valor={colaborador.username ? `@${colaborador.username}` : "Sin usuario"} />
            <Dato icono="phone" etiqueta="Teléfono" valor={colaborador.telefono || "Sin teléfono"} />
            <Dato
              icono="business"
              etiqueta="Negocios"
              valor={links.length === 0 ? "Sin negocios" : links.map((l) => `${l.name} · ${rolLabel(l.role)}`).join("\n")}
            />
            <Dato
              icono="shield"
              etiqueta="Permisos"
              valor={colaborador.permissions.length === 0 ? "De su rol" : `${colaborador.permissions.length} explícitos`}
            />
          </View>
        </View>

        <Seccion titulo="Cuenta" descripcion="Acceso al panel y contraseña de esta persona.">
          {puedeActuar && !colaborador.is_self ? (
            <Switch
              testID="colaborador-estado"
              label="Cuenta activa"
              description="Si la desactivas, no podrá iniciar sesión y libera su cupo del plan."
              value={activo}
              onValueChange={cambiarActivo}
              disabled={cambiandoEstado}
            />
          ) : (
            <View style={styles.soloLectura}>
              <Badge
                label={activo ? "Activa" : "Inactiva"}
                tone={activo ? "success" : "neutral"}
                icon={activo ? "check-circle" : "block"}
              />
              <Text style={[shType.caption, { color: c.textMuted }]}>
                {colaborador.is_self
                  ? "Es tu cuenta: el estado se gestiona desde otra cuenta."
                  : "No puedes cambiar el estado de esta cuenta."}
              </Text>
            </View>
          )}

          {puedeActuar ? (
            <>
              <Button
                testID="colaborador-password"
                variant="secondary"
                iconLeft="key"
                onPress={() => {
                  setPasswordAbierto((abierto) => !abierto);
                  setPasswordError(null);
                }}
              >
                Restablecer contraseña
              </Button>
              {passwordAbierto ? (
                <View style={styles.formulario}>
                  <Field
                    label="Nueva contraseña"
                    required
                    hint="Mínimo 8 caracteres. Se cerrarán las sesiones abiertas de esa cuenta."
                    error={passwordError}
                  >
                    <PasswordField
                      testID="colaborador-password-nueva"
                      value={password}
                      onChangeText={setPassword}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </Field>
                  <View style={styles.accionesFormulario}>
                    <Button
                      variant="ghost"
                      onPress={() => {
                        setPasswordAbierto(false);
                        setPassword("");
                        setPasswordError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      testID="colaborador-password-guardar"
                      loading={cambiandoPassword}
                      disabled={cambiandoPassword}
                      onPress={() => void cambiarPassword()}
                    >
                      Cambiar contraseña
                    </Button>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </Seccion>

        <Seccion
          titulo="Permisos"
          descripcion="Acceso por sección en este negocio. Se guardan todos juntos."
        >
          {esMaster ? (
            <View style={styles.selectorNegocio}>
              <Text style={[shType.label, { color: c.text }]}>Negocio</Text>
              <Button
                testID="colaborador-negocio"
                variant="secondary"
                fullWidth
                iconRight="expand-more"
                onPress={() => setNegocioAbierto(true)}
              >
                {nombreNegocio}
              </Button>
            </View>
          ) : (
            <Text style={[shType.caption, { color: c.textMuted }]}>
              Negocio activo: {sesion?.tenantName ?? "—"}
            </Text>
          )}

          {cargandoPermisos ? (
            <View testID="permisos-cargando" style={styles.permisosCargando}>
              <Skeleton lines={3} />
              <Skeleton lines={3} />
            </View>
          ) : errorPermisos ? (
            <View style={styles.errorPermisos}>
              <Text
                testID="permisos-error"
                accessibilityLiveRegion="polite"
                style={[shType.dense, { color: tonos.danger.fg }]}
              >
                {errorPermisos}
              </Text>
              <Button variant="secondary" onPress={() => void cargarPermisos()}>
                Reintentar
              </Button>
            </View>
          ) : secciones.length === 0 ? (
            <Text style={[shType.dense, { color: c.textMuted }]}>
              No hay secciones para gestionar desde esta cuenta.
            </Text>
          ) : (
            <View style={styles.permisos}>
              {!puedeGestionar ? (
                <Text style={[shType.caption, { color: c.textMuted }]}>
                  Solo lectura: no puedes cambiar los permisos.
                </Text>
              ) : null}
              {secciones.map((seccion) => (
                <View
                  key={seccion}
                  style={[styles.permiso, { borderBottomColor: c.borderSoft }]}
                >
                  <View style={styles.permisoTitulo}>
                    <Text style={[shType.label, styles.permisoNombre, { color: c.text }]}>
                      {seccionLabel(seccion)}
                    </Text>
                    {permisos[seccion]?.heredado ? <Badge label="heredado" tone="neutral" /> : null}
                  </View>
                  <SelectorAcceso
                    label={seccionLabel(seccion)}
                    valor={permisos[seccion]?.access ?? "none"}
                    onChange={(valor) =>
                      setPermisos((previos) => ({
                        ...previos,
                        [seccion]: { access: valor, heredado: false },
                      }))
                    }
                    disabled={!puedeGestionar || guardandoPermisos}
                    testID={`permiso-${seccion}`}
                  />
                </View>
              ))}
              {puedeGestionar ? (
                <Button
                  testID="permisos-guardar"
                  fullWidth
                  loading={guardandoPermisos}
                  disabled={guardandoPermisos}
                  onPress={() => void guardarPermisos()}
                >
                  Guardar permisos
                </Button>
              ) : null}
            </View>
          )}
        </Seccion>

        <Seccion titulo="Negocios" descripcion="Dónde tiene acceso esta cuenta y con qué rol.">
          {links.length === 0 ? (
            <Text style={[shType.dense, { color: c.textMuted }]}>
              No está vinculada a ningún negocio.
            </Text>
          ) : (
            <View style={styles.links}>
              {links.map((link) => (
                <View
                  key={`${link.slug}-${link.role}`}
                  style={[styles.link, { borderColor: c.borderSoft }]}
                >
                  <View style={styles.linkTexto}>
                    <Text style={[shType.body, { color: c.text }]} numberOfLines={1}>
                      {link.name}
                    </Text>
                    <Text style={[shType.caption, { color: c.textMuted }]}>{rolLabel(link.role)}</Text>
                  </View>
                  {puedeActuar && !colaborador.is_self ? (
                    <IconButton
                      testID={`desvincular-${link.slug}`}
                      icon="link-off"
                      label={`Desvincular de ${link.name}`}
                      tone="danger"
                      onPress={() => confirmarDesvincular(link)}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          )}
          {esMaster && puedeGestionar ? (
            <Button
              testID="colaborador-vincular"
              variant="secondary"
              iconLeft="add-link"
              onPress={() => setVincularAbierto(true)}
            >
              Vincular negocio
            </Button>
          ) : null}
        </Seccion>
      </ScrollView>

      <Sheet
        visible={negocioAbierto}
        onClose={() => setNegocioAbierto(false)}
        title="Negocio para los permisos"
        description="Elige el alcance de la grilla. Global aplica a todos los negocios vinculados."
        testID="hoja-negocio"
      >
        <RadioGroup
          label="Negocio para los permisos"
          options={opcionesNegocio}
          value={negocio}
          onValueChange={(valor) => {
            setNegocio(valor);
            setNegocioAbierto(false);
          }}
          testID="negocio-permisos"
        />
      </Sheet>

      <HojaVincularNegocio
        visible={vincularAbierto}
        api={api}
        colaboradorId={colaborador.id}
        onClose={() => setVincularAbierto(false)}
        onVinculado={(negocioVinculado, role) => {
          setLinks((previos) =>
            previos.some((l) => l.slug === negocioVinculado.slug)
              ? previos
              : [...previos, { slug: negocioVinculado.slug, name: negocioVinculado.name, role }],
          );
          setMensaje(`Cuenta vinculada a ${negocioVinculado.name}.`);
          notificarCambioEquipo();
        }}
      />
    </View>
  );
}

function Aviso({
  tono,
  icono,
  texto,
  testID,
}: {
  tono: "success" | "danger" | "warning";
  icono: IconName;
  texto: string;
  testID?: string;
}) {
  const { tonos } = useKit();
  const t = tonos[tono];
  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      style={[styles.aviso, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icono name={icono} size={18} color={t.fg} />
      <Text style={[shType.dense, styles.avisoTexto, { color: t.fg }]}>{texto}</Text>
    </View>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  const { c } = useKit();
  return (
    <View style={[styles.tarjeta, { backgroundColor: c.surface, borderColor: c.borderSoft }]}>
      <View style={styles.seccionCabecera}>
        <Text style={[shType.block, { color: c.text }]}>{titulo}</Text>
        {descripcion ? (
          <Text style={[shType.caption, { color: c.textMuted }]}>{descripcion}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Dato({
  icono,
  etiqueta,
  valor,
}: {
  icono: IconName;
  etiqueta: string;
  valor: string;
}) {
  const { c } = useKit();
  return (
    <View style={styles.dato}>
      <Icono name={icono} size={18} color={c.textMuted} />
      <View style={styles.datoTexto}>
        <Text style={[shType.caption, { color: c.textMuted }]}>{etiqueta}</Text>
        <Text style={[shType.body, { color: c.text }]}>{valor}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    paddingHorizontal: shSpace[4],
    gap: shSpace[4],
  },
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[4],
    gap: shSpace[4],
  },
  contactoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
  },
  contactoTextos: { flex: 1, gap: shSpace[1] },
  nombreFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
  },
  nombre: { flexShrink: 1 },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: shSpace[1],
    marginTop: shSpace[1],
  },
  datos: {
    borderTopWidth: 1,
    paddingTop: shSpace[3],
    gap: shSpace[3],
  },
  dato: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[2],
  },
  datoTexto: { flex: 1, gap: 2 },
  seccionCabecera: { gap: 2 },
  soloLectura: { flexDirection: "row", alignItems: "center", gap: shSpace[2] },
  formulario: { gap: shSpace[3] },
  accionesFormulario: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: shSpace[2],
    flexWrap: "wrap",
  },
  selectorNegocio: { gap: shSpace[1] },
  permisosCargando: { gap: shSpace[3] },
  errorPermisos: { gap: shSpace[2] },
  permisos: { gap: shSpace[3] },
  permiso: {
    gap: shSpace[2],
    borderBottomWidth: 1,
    paddingBottom: shSpace[3],
  },
  permisoTitulo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: shSpace[2],
  },
  permisoNombre: { flexShrink: 1 },
  links: { gap: shSpace[2] },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
  },
  linkTexto: { flex: 1, gap: 2 },
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[3],
  },
  avisoTexto: { flex: 1 },
});
