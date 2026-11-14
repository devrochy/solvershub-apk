import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import {
  Button,
  Checkbox,
  EmptyState,
  Icono,
  Skeleton,
  useKit,
} from "@shared/ui";
import {
  abrirColaborador,
  suscribirCambioEquipo,
} from "@shared/equipo-evento";
import {
  cargarColaboradores,
  cargarInvitacionesSalientes,
  revocarInvitacion,
  type CollaboratorItem,
  type OutgoingItem,
} from "../api";
import { resumenEquipo, rolLabel } from "./dominio";
import { HojaInvitarColaborador } from "./HojaInvitarColaborador";
import { TarjetaColaborador } from "./TarjetaColaborador";

function fechaCorta(valor: string | null): string {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

function Pildora({
  icono,
  texto,
  tono,
  testID,
}: {
  icono: "group" | "check-circle" | "mail";
  texto: string;
  tono: "neutral" | "success" | "warning";
  testID?: string;
}) {
  const { tonos } = useKit();
  const t = tonos[tono];
  return (
    <View
      testID={testID}
      style={[styles.pildora, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icono name={icono} size={14} color={t.fg} />
      <Text
        maxFontSizeMultiplier={1.6}
        style={[shType.caption, styles.pildoraTexto, { color: t.fg }]}
      >
        {texto}
      </Text>
    </View>
  );
}

/**
 * Equipo (Cuenta › Equipo): cuentas del negocio activo en tarjetas de contacto.
 * Cada tarjeta abre una ficha completa; desde ahí se gestionan permisos,
 * contraseña, estado y negocios. El master puede ver todas las cuentas y
 * vincular negocios. Misma información y acciones que el panel (SPEC-34).
 */
export function EquipoTab() {
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const { c, tonos } = useKit();
  const insets = useSafeAreaInsets();
  const esMaster = sesion?.role === "master";
  const puedeGestionar = esMaster || sesion?.permissions?.collaborators === "write";

  const [filas, setFilas] = useState<CollaboratorItem[]>([]);
  const [invitaciones, setInvitaciones] = useState<OutgoingItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [todas, setTodas] = useState(false);
  const [cargandoTodas, setCargandoTodas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [invitar, setInvitar] = useState(false);

  const cargar = useCallback(
    async (pedirTodas: boolean) => {
      const [cuentas, salientes] = await Promise.allSettled([
        cargarColaboradores(api, { todos: pedirTodas && esMaster }),
        cargarInvitacionesSalientes(api),
      ]);
      if (cuentas.status === "fulfilled") {
        setFilas(cuentas.value);
        setError(null);
      } else {
        setError("No pudimos cargar el equipo. Revisa tu conexión e inténtalo de nuevo.");
      }
      setInvitaciones(salientes.status === "fulfilled" ? salientes.value : []);
    },
    [api, esMaster],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras await
    void cargar(false).finally(() => setCargando(false));
  }, [cargar]);

  useEffect(() => suscribirCambioEquipo(() => void cargar(todas)), [cargar, todas]);

  useEffect(() => {
    if (!mensaje) return;
    const temporizador = setTimeout(() => setMensaje(null), 4500);
    return () => clearTimeout(temporizador);
  }, [mensaje]);

  const alternarTodas = async (verTodas: boolean) => {
    setTodas(verTodas);
    setCargandoTodas(true);
    try {
      await cargar(verTodas);
    } finally {
      setCargandoTodas(false);
    }
  };

  const refrescar = async () => {
    setRefrescando(true);
    try {
      await cargar(todas);
    } finally {
      setRefrescando(false);
    }
  };

  const confirmarRevocar = (inv: OutgoingItem) => {
    Alert.alert(
      "Revocar invitación",
      `El enlace de ${inv.email} deja de valer y no podrá aceptar la invitación.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Revocar",
          style: "destructive",
          onPress: () => {
            void revocarInvitacion(api, inv.id)
              .then(() => {
                setInvitaciones((previas) => previas.filter((i) => i.id !== inv.id));
                setMensaje("Invitación revocada.");
              })
              .catch(() => setError("No pudimos revocar la invitación."));
          },
        },
      ],
    );
  };

  const resumen = resumenEquipo(filas, invitaciones);

  if (cargando) {
    return (
      <View testID="equipo-tab" accessibilityState={{ busy: true }} style={styles.contenedor}>
        <View style={styles.resumen}>
          <Pildora icono="group" texto="Cargando equipo…" tono="neutral" />
        </View>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.esqueleto, { backgroundColor: c.surface, borderColor: c.borderSoft }]}
          >
            <Skeleton shape="circle" height={56} />
            <View style={styles.esqueletoTexto}>
              <Skeleton lines={2} />
              <Skeleton width="45%" />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (error && filas.length === 0) {
    return (
      <View testID="equipo-tab" style={styles.contenedor}>
        <EmptyState
          testID="equipo-error"
          icon="cloud-off"
          title="No pudimos cargar el equipo"
          description={error}
          action={{ label: "Reintentar", onPress: () => void cargar(todas) }}
        />
      </View>
    );
  }

  const cabecera = (
    <View style={styles.cabecera}>
      <Text style={[shType.dense, { color: c.textMuted }]}>
        Tu equipo: cuentas con acceso al panel, sus permisos por sección y sus negocios vinculados.
      </Text>
      {!puedeGestionar ? (
        <View
          style={[
            styles.aviso,
            { backgroundColor: c.surface2, borderColor: c.borderSoft },
          ]}
        >
          <Icono name="lock-outline" size={18} color={c.textMuted} />
          <Text style={[shType.caption, styles.avisoTexto, { color: c.textMuted }]}>
            Solo lectura: no tienes permiso para gestionar el equipo.
          </Text>
        </View>
      ) : null}
      <View style={styles.resumen}>
        <Pildora
          testID="equipo-total"
          icono="group"
          tono="neutral"
          texto={`${resumen.total} ${resumen.total === 1 ? "cuenta" : "cuentas"}`}
        />
        <Pildora
          testID="equipo-activas"
          icono="check-circle"
          tono="success"
          texto={`${resumen.activas} ${resumen.activas === 1 ? "activa" : "activas"}`}
        />
        {resumen.pendientes > 0 ? (
          <Pildora
            testID="equipo-pendientes"
            icono="mail"
            tono="warning"
            texto={`${resumen.pendientes} ${
              resumen.pendientes === 1 ? "invitación pendiente" : "invitaciones pendientes"
            }`}
          />
        ) : null}
      </View>
      {esMaster ? (
        <Checkbox
          testID="equipo-todas"
          label={cargandoTodas ? "Cargando cuentas…" : "Todas las cuentas"}
          description="Ver las cuentas de toda la plataforma, no solo las de este negocio."
          checked={todas}
          disabled={cargandoTodas}
          onCheckedChange={(valor) => void alternarTodas(valor)}
        />
      ) : null}
      {mensaje ? (
        <View
          testID="equipo-mensaje"
          accessibilityLiveRegion="polite"
          style={[
            styles.aviso,
            { backgroundColor: tonos.success.bg, borderColor: tonos.success.border },
          ]}
        >
          <Icono name="check-circle" size={18} color={tonos.success.fg} />
          <Text style={[shType.caption, styles.avisoTexto, { color: tonos.success.fg }]}>
            {mensaje}
          </Text>
        </View>
      ) : null}
      {error ? (
        <View
          testID="equipo-error-inline"
          style={[styles.aviso, { backgroundColor: tonos.danger.bg, borderColor: tonos.danger.border }]}
        >
          <Icono name="error-outline" size={18} color={tonos.danger.fg} />
          <Text style={[shType.caption, styles.avisoTexto, { color: tonos.danger.fg }]}>
            {error}
          </Text>
          <Button variant="ghost" size="sm" onPress={() => void cargar(todas)}>
            Reintentar
          </Button>
        </View>
      ) : null}
    </View>
  );

  const pie = (
    <View style={styles.pieLista}>
      {invitaciones.length > 0 ? (
        <View style={styles.invitaciones}>
          <Text style={[shType.block, { color: c.text }]}>Invitaciones pendientes</Text>
          {invitaciones.map((inv) => (
            <View
              key={inv.id}
              style={[styles.invitacion, { backgroundColor: c.surface, borderColor: c.borderSoft }]}
            >
              <View style={styles.invitacionTexto}>
                <Text style={[shType.body, { color: c.text }]} numberOfLines={1}>
                  {inv.email}
                </Text>
                <Text style={[shType.caption, { color: c.textMuted }]}>
                  {rolLabel(inv.rol)}
                  {inv.creadaEn ? ` · ${fechaCorta(inv.creadaEn)}` : ""}
                </Text>
              </View>
              <Button
                testID={`revocar-${inv.id}`}
                variant="ghost"
                size="sm"
                onPress={() => confirmarRevocar(inv)}
              >
                Revocar
              </Button>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View testID="equipo-tab" style={styles.contenedor}>
      <FlatList
        testID="config-lista-colaboradores"
        data={filas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarjetaColaborador
            colaborador={item}
            testID={`colaborador-${item.email}`}
            onPress={() => abrirColaborador(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separador} />}
        ListHeaderComponent={cabecera}
        ListFooterComponent={pie}
        ListEmptyComponent={
          <EmptyState
            testID="equipo-vacio"
            icon="group"
            title="Sin equipo todavía"
            description="Invita a tu equipo para que gestionen el panel contigo."
            action={
              puedeGestionar
                ? { label: "Nuevo colaborador", onPress: () => setInvitar(true) }
                : undefined
            }
            secondaryAction={{ label: "Actualizar", onPress: () => void cargar(todas) }}
          />
        }
        refreshing={refrescando}
        onRefresh={() => void refrescar()}
        contentContainerStyle={styles.lista}
        style={styles.listaFlex}
      />

      {puedeGestionar ? (
        <View
          style={[
            styles.pieFijo,
            {
              backgroundColor: c.bg,
              borderTopColor: c.borderSoft,
              paddingBottom: insets.bottom + shSpace[3],
            },
          ]}
        >
          <Button
            testID="equipo-invitar"
            fullWidth
            iconLeft="person-add"
            onPress={() => setInvitar(true)}
          >
            Nuevo colaborador
          </Button>
        </View>
      ) : null}

      <HojaInvitarColaborador
        visible={invitar}
        api={api}
        esMaster={esMaster}
        tenantName={sesion?.tenantName}
        onClose={() => setInvitar(false)}
        onCreado={(texto) => {
          setMensaje(texto);
          setInvitar(false);
          void cargar(todas);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, gap: shSpace[3] },
  listaFlex: { flex: 1 },
  lista: { gap: shSpace[2], paddingBottom: shSpace[4] },
  cabecera: { gap: shSpace[3], paddingBottom: shSpace[2] },
  resumen: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  pildora: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    borderWidth: 1,
    borderRadius: shRadius.pill,
    paddingHorizontal: shSpace[2],
    paddingVertical: shSpace[1],
  },
  pildoraTexto: { fontVariant: ["tabular-nums"] },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.sm,
    padding: shSpace[3],
  },
  avisoTexto: { flex: 1 },
  separador: { height: shSpace[2] },
  esqueleto: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[4],
    marginBottom: shSpace[2],
  },
  esqueletoTexto: { flex: 1, gap: shSpace[2] },
  pieLista: { paddingTop: shSpace[4], gap: shSpace[3] },
  invitaciones: { gap: shSpace[2] },
  invitacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: shRadius.md,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[2],
  },
  invitacionTexto: { flex: 1, gap: 2 },
  pieFijo: {
    borderTopWidth: 1,
    paddingTop: shSpace[3],
    marginHorizontal: -shSpace[3],
    paddingHorizontal: shSpace[3],
  },
});
