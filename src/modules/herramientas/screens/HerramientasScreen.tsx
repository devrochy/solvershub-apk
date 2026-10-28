import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import {
  abrirPestanaAjena,
  usePestanasDeEntrada,
  type EntradaPestanas,
  type SolicitudPestana,
} from "@shared/pestana-inicial";
import { AdminApiError } from "@core/api/admin";
import { shDensity, shRadius, shSpace, shType } from "@core/theme/tokens";
import { useTheme } from "@core/theme/theme-context";
import { useAdminSession } from "@core/session/admin-session-context";
import { useAdminApi } from "@core/session/use-admin-api";
import { baseActual } from "@data/bootstrap";
import { registrarAccionCritica } from "@data/auditoria-sync";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  Icono,
  RadioGroup,
  Sheet,
  Skeleton,
  Switch,
  TextField,
  useKit,
} from "@shared/ui";
import {
  AVISO_DESACTIVAR_PRIMERO,
  MENSAJE_NO_SUSPENDIDO,
  accionNegocio,
  cambiarPlanNegocio,
  cargarDlq,
  cargarNegocios,
  cargarPlanes,
  fraseDeEliminar,
  purgarNegocio,
  reintentarDlq,
  sePuedeEliminar,
  type DlqEntry,
  type PlanInfo,
  type PlatformTenant,
} from "../api";
import { estadoDelPlan, formatearFechaCorta, formatearPrecio } from "../presentacion";

type Pestana = "fallos" | "negocios";

/** El tono del plan se estrecha para respetar la unión del kit (neutral/accent vs. estado). */
function BadgeDePlan({ tenant }: { tenant: PlatformTenant }) {
  const estado = estadoDelPlan(tenant);
  if (estado.tone === "neutral") {
    return <Badge tone="neutral" icon={estado.icon} label={estado.label} />;
  }
  if (estado.tone === "accent") {
    return <Badge tone="accent" icon={estado.icon} label={estado.label} />;
  }
  return <Badge tone={estado.tone} icon={estado.icon} label={estado.label} />;
}

function FilaDetalle({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const { c } = useKit();
  return (
    <View style={styles.filaDetalle}>
      <Text style={[shType.label, { color: c.textMuted }]}>{etiqueta}</Text>
      <View style={styles.valorDetalle}>{children}</View>
    </View>
  );
}

export function HerramientasScreen({
  pestanaInicial,
  entrada,
}: { pestanaInicial?: SolicitudPestana; entrada?: EntradaPestanas } = {}) {
  const { colores } = useTheme();
  const { c, ripple } = useKit();
  const api = useAdminApi();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";

  const todas = useMemo<Pestana[]>(() => (esMaster ? ["fallos", "negocios"] : ["fallos"]), [esMaster]);
  // Mensajes fallidos es de la entrada Configuración (sus otras pestañas se abren
  // por el bus) y Negocios, de Plataforma.
  const { pestana, setPestana, propias, ajenas } = usePestanasDeEntrada<Pestana>(
    "herramientas",
    "fallos",
    todas,
    pestanaInicial,
    entrada,
  );
  const [entradas, setEntradas] = useState<DlqEntry[]>([]);
  const [negocios, setNegocios] = useState<PlatformTenant[]>([]);
  const [planes, setPlanes] = useState<PlanInfo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cambiandoEstado, setCambiandoEstado] = useState<string | null>(null);

  const [porCambiarPlan, setPorCambiarPlan] = useState<PlatformTenant | null>(null);
  const [planElegido, setPlanElegido] = useState("");
  const [diasExtra, setDiasExtra] = useState("0");
  const [cargandoPlanes, setCargandoPlanes] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [errorPlan, setErrorPlan] = useState<string | null>(null);
  const [aplicandoPlan, setAplicandoPlan] = useState(false);

  const [detalle, setDetalle] = useState<PlatformTenant | null>(null);

  const [porEliminar, setPorEliminar] = useState<PlatformTenant | null>(null);
  const [frase, setFrase] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const dlq = await cargarDlq(api);
      setError(null);
      setEntradas(dlq.entries);
      if (esMaster) {
        const [pagina, planesRes] = await Promise.all([
          cargarNegocios(api).catch(() => null),
          cargarPlanes(api).catch(() => null),
        ]);
        setNegocios(pagina?.items ?? []);
        if (planesRes) setPlanes(planesRes);
      }
    } catch {
      setError("No pudimos cargar las herramientas. Revisa tu conexión.");
    }
  }, [api, esMaster]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: los setState ocurren después del await (no síncronos)
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  const refrescarNegocios = useCallback(async () => {
    const pagina = await cargarNegocios(api).catch(() => null);
    if (pagina) setNegocios(pagina.items);
  }, [api]);

  const asegurarPlanes = useCallback(async () => {
    if (planes.length > 0) return;
    setCargandoPlanes(true);
    setPlanError(null);
    try {
      const lista = await cargarPlanes(api);
      setPlanes(lista);
      if (lista.length === 0) setPlanError("No hay planes disponibles.");
    } catch {
      setPlanError("No pudimos cargar los planes. Revisa tu conexión.");
    } finally {
      setCargandoPlanes(false);
    }
  }, [api, planes.length]);

  const planSeleccionado = useMemo(() => {
    if (!porCambiarPlan) return "";
    return planElegido || planes.find((p) => p.name === porCambiarPlan.plan_name)?.id || planes[0]?.id || "";
  }, [porCambiarPlan, planElegido, planes]);

  const reintentar = (entrada: DlqEntry) => {
    void reintentarDlq(api, entrada.entry_id)
      .then(cargar)
      .catch(() => setError("No se pudo reintentar el evento."));
  };

  const cambiarEstado = (t: PlatformTenant, suspender: boolean) => {
    setCambiandoEstado(t.id);
    setError(null);
    const db = baseActual();
    if (db) {
      void registrarAccionCritica(db, {
        accion: suspender ? "suspender_negocio" : "activar_negocio",
        entidad: "tenant",
        entidadId: t.id,
        payload: { slug: t.slug },
      }).catch(() => undefined);
    }
    void accionNegocio(api, t.id, suspender ? "deactivate" : "activate")
      .then(() =>
        setNegocios((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, status: suspender ? "suspended" : "active" } : x)),
        ),
      )
      .catch(() => setError("No se pudo cambiar el estado del negocio."))
      .finally(() => setCambiandoEstado(null));
  };

  const confirmarEstado = (t: PlatformTenant) => {
    const suspender = t.status === "active";
    Alert.alert(
      suspender ? "Suspender negocio" : "Activar negocio",
      suspender
        ? `${t.name} dejará de operar hasta que lo reactives. Sus datos y conversaciones se conservan.`
        : `${t.name} volverá a operar de inmediato con el plan actual.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: suspender ? "Suspender" : "Activar",
          style: suspender ? "destructive" : "default",
          onPress: () => cambiarEstado(t, suspender),
        },
      ],
    );
  };

  const abrirPlan = (t: PlatformTenant) => {
    setPorCambiarPlan(t);
    setPlanElegido("");
    setDiasExtra("0");
    setErrorPlan(null);
    void asegurarPlanes();
  };

  const aplicarPlan = (t: PlatformTenant) => {
    const plan = planes.find((p) => p.id === planSeleccionado);
    if (!plan) {
      setErrorPlan("Elige un plan.");
      return;
    }
    setAplicandoPlan(true);
    setErrorPlan(null);
    const extra = Math.max(0, Math.trunc(Number(diasExtra) || 0));
    void cambiarPlanNegocio(api, t.id, plan.id, extra)
      .then(() => {
        const db = baseActual();
        if (db) {
          void registrarAccionCritica(db, {
            accion: "cambiar_plan_negocio",
            entidad: "tenant",
            entidadId: t.id,
            payload: { slug: t.slug, plan_id: plan.id },
          }).catch(() => undefined);
        }
        setNegocios((prev) =>
          prev.map((x) =>
            x.id === t.id ? { ...x, plan_name: plan.name, plan_status: "active", operational: true } : x,
          ),
        );
        setPorCambiarPlan(null);
        void refrescarNegocios();
        Alert.alert("Plan actualizado", `${t.name} ahora usa ${plan.name}.`);
      })
      .catch((e: unknown) =>
        setErrorPlan(e instanceof AdminApiError ? e.message : "No se pudo cambiar el plan."),
      )
      .finally(() => setAplicandoPlan(false));
  };

  const abrirDetalle = (t: PlatformTenant) => setDetalle(t);

  const abrirEliminar = (t: PlatformTenant) => {
    setFrase("");
    setErrorEliminar(null);
    setPorEliminar(t);
  };

  const cerrarEliminar = () => {
    if (!eliminando) setPorEliminar(null);
  };

  const eliminar = (t: PlatformTenant) => {
    setEliminando(true);
    setErrorEliminar(null);
    void purgarNegocio(api, t.id, frase.trim())
      .then(() => {
        const db = baseActual();
        if (db) {
          void registrarAccionCritica(db, {
            accion: "eliminar_negocio",
            entidad: "tenant",
            entidadId: t.id,
            payload: { slug: t.slug },
          }).catch(() => undefined);
        }
        setPorEliminar(null);
        void refrescarNegocios();
      })
      .catch((e: unknown) => {
        setErrorEliminar(
          e instanceof AdminApiError && e.code === "tenant_not_suspended"
            ? MENSAJE_NO_SUSPENDIDO
            : e instanceof AdminApiError
              ? e.message
              : "No se pudo eliminar el negocio.",
        );
      })
      .finally(() => setEliminando(false));
  };

  const eliminable = porEliminar ? sePuedeEliminar(porEliminar.status) : false;
  const fraseEsperada = porEliminar ? fraseDeEliminar(porEliminar.slug) : "";

  return (
    <View style={[styles.contenedor, { backgroundColor: colores.fondo }]}>
      {propias.length + ajenas.length > 1 ? (
        <View style={[styles.pestanas, { borderColor: colores.borde }]}>
          {propias.map((p) => (
            <Pressable
              key={p}
              testID={`herramientas-${p}`}
              onPress={() => setPestana(p)}
              style={[
                styles.pestana,
                pestana === p && { borderBottomColor: colores.acento, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={{
                  color: pestana === p ? colores.texto : colores.textoSuave,
                  fontWeight: "600",
                }}
              >
                {p === "fallos" ? "Bandeja de fallos" : "Negocios"}
              </Text>
            </Pressable>
          ))}
          {ajenas.map((a) => (
            <Pressable
              key={`${a.tab}-${a.pestana}`}
              testID={`herramientas-${a.pestana}`}
              onPress={() => abrirPestanaAjena(a)}
              style={styles.pestana}
            >
              <Text style={{ color: colores.textoSuave, fontWeight: "600" }} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text
          testID="herramientas-error"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: colores.peligro, marginBottom: 8 }}
        >
          {error}
        </Text>
      ) : null}

      {cargando ? (
        <View style={styles.esqueletos} accessibilityState={{ busy: true }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} shape="rect" height={116} />
          ))}
        </View>
      ) : pestana === "fallos" ? (
        <FlatList
          testID="herramientas-lista-dlq"
          data={entradas}
          keyExtractor={(e) => e.entry_id}
          ListEmptyComponent={
            <Text style={{ color: colores.textoSuave, textAlign: "center", marginTop: 20 }}>
              Sin eventos fallidos. 🎉
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`dlq-${item.entry_id}`}
              onPress={() => reintentar(item)}
              style={[styles.fila, { borderColor: colores.borde, backgroundColor: colores.tarjeta }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colores.texto, fontSize: 13 }} numberOfLines={2}>
                  {item.content}
                </Text>
                <Text style={{ color: colores.textoSuave, fontSize: 11 }}>
                  {item.external_message_id ?? item.entry_id}
                </Text>
              </View>
              <Text style={{ color: colores.acento, fontSize: 12 }}>Reintentar</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          testID="herramientas-lista-negocios"
          data={negocios}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.listaNegocios}
          ListEmptyComponent={
            <EmptyState
              icon="business"
              title="Sin negocios"
              description="No hay negocios para mostrar."
              action={{ label: "Actualizar", onPress: () => void cargar() }}
            />
          }
          renderItem={({ item }) => (
            <View
              testID={`negocio-plataforma-${item.slug}`}
              style={[styles.tarjeta, { borderColor: c.borderSoft, backgroundColor: c.surface }]}
            >
              <View style={styles.tarjetaCabecera}>
                <View style={styles.tarjetaTextos}>
                  <Text style={[shType.block, { color: c.text }]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[shType.caption, { color: c.textMuted }]} numberOfLines={1}>
                    {item.slug}
                  </Text>
                </View>
                <Switch
                  testID={`negocio-estado-${item.slug}`}
                  label={item.status === "active" ? "Activo" : "Suspendido"}
                  value={item.status === "active"}
                  onValueChange={() => confirmarEstado(item)}
                  disabled={cambiandoEstado === item.id}
                />
              </View>

              <View style={styles.tarjetaPie}>
                <Pressable
                  testID={`negocio-plan-${item.slug}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Cambiar plan de ${item.name}. Plan actual: ${estadoDelPlan(item).label}.`}
                  onPress={() => abrirPlan(item)}
                  android_ripple={{ color: ripple.superficie }}
                  style={({ pressed }) => [styles.planBoton, pressed && styles.presionado]}
                >
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    <BadgeDePlan tenant={item} />
                  </View>
                  <Icono name="expand-more" size={18} color={c.textSoft} />
                </Pressable>

                <View style={styles.acciones}>
                  <IconButton
                    testID={`negocio-detalle-${item.slug}`}
                    icon="visibility"
                    label={`Ver detalle de ${item.name}`}
                    onPress={() => abrirDetalle(item)}
                  />
                  <IconButton
                    testID={`negocio-eliminar-${item.slug}`}
                    icon="delete-outline"
                    tone="danger"
                    label={`Eliminar ${item.name}`}
                    onPress={() => abrirEliminar(item)}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}

      <Sheet
        testID="cambiar-plan"
        visible={porCambiarPlan !== null}
        onClose={() => {
          if (!aplicandoPlan) setPorCambiarPlan(null);
        }}
        title="Cambiar plan"
        description={
          porCambiarPlan
            ? `${porCambiarPlan.name} · plan actual: ${estadoDelPlan(porCambiarPlan).label}`
            : undefined
        }
        footer={
          porCambiarPlan ? (
            <Button
              testID="aplicar-plan-negocio"
              fullWidth
              loading={aplicandoPlan}
              disabled={!planSeleccionado || cargandoPlanes}
              onPress={() => aplicarPlan(porCambiarPlan)}
            >
              Aplicar plan
            </Button>
          ) : null
        }
      >
        {cargandoPlanes ? (
          <View style={styles.esqueletosPlan}>
            <Skeleton shape="text" lines={3} />
            <Skeleton shape="rect" height={48} />
          </View>
        ) : planError ? (
          <View style={styles.errorPlan}>
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[shType.dense, { color: c.statusDangerFg }]}
            >
              {planError}
            </Text>
            <Button variant="secondary" onPress={() => void asegurarPlanes()}>
              Reintentar
            </Button>
          </View>
        ) : (
          <>
            <RadioGroup
              label="Plan"
              testID="plan-negocio"
              options={planes.map((plan) => ({
                value: plan.id,
                label: plan.name,
                description: plan.is_free ? "Gratis" : `${formatearPrecio(plan.price_cop)} / mes`,
              }))}
              value={planSeleccionado}
              onValueChange={setPlanElegido}
            />
            <Field label="Días extra" hint="0 = sin extensión.">
              <TextField
                testID="plan-dias-extra"
                value={diasExtra}
                onChangeText={setDiasExtra}
                keyboardType="number-pad"
                maxLength={4}
              />
            </Field>
            <Text style={[shType.caption, { color: c.textMuted }]}>
              El cambio aplica de inmediato y activa la suscripción. Los días extra se suman al período actual.
            </Text>
            {errorPlan ? (
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[shType.dense, { color: c.statusDangerFg }]}
              >
                {errorPlan}
              </Text>
            ) : null}
          </>
        )}
      </Sheet>

      <Sheet
        testID="detalle-negocio"
        visible={detalle !== null}
        onClose={() => setDetalle(null)}
        title="Detalle del negocio"
        description={detalle ? `${detalle.name} · ${detalle.slug}` : undefined}
      >
        {detalle && (
          <View style={styles.detalle}>
            <FilaDetalle etiqueta="Estado">
              <Badge
                tone={detalle.status === "active" ? "success" : "warning"}
                icon={detalle.status === "active" ? "check-circle" : "pause-circle-outline"}
                label={detalle.status === "active" ? "Activo" : "Suspendido"}
              />
            </FilaDetalle>
            <FilaDetalle etiqueta="Plan">
              <BadgeDePlan tenant={detalle} />
            </FilaDetalle>
            <FilaDetalle etiqueta="Operativo">
              <Text
                style={[shType.label, { color: detalle.operational ? c.statusSuccessFg : c.statusDangerFg }]}
              >
                {detalle.operational ? "Sí" : "No"}
              </Text>
            </FilaDetalle>
            <FilaDetalle etiqueta="Creado">
              <Text style={[shType.label, { color: c.text }]}>{formatearFechaCorta(detalle.created_at)}</Text>
            </FilaDetalle>
          </View>
        )}
      </Sheet>

      <Sheet
        testID="eliminar-negocio"
        visible={porEliminar !== null}
        onClose={cerrarEliminar}
        title="Eliminar negocio"
        description={porEliminar ? `${porEliminar.name} · ${porEliminar.slug}. Borra todos sus datos y no se puede deshacer.` : undefined}
        footer={
          eliminable ? (
            <Button
              testID="eliminar-negocio-confirmar"
              variant="danger"
              fullWidth
              loading={eliminando}
              disabled={frase.trim() !== fraseEsperada}
              onPress={() => porEliminar && eliminar(porEliminar)}
            >
              Eliminar definitivamente
            </Button>
          ) : null
        }
      >
        {eliminable ? (
          <Field label="Frase de confirmación" hint={`Escribe exactamente: ${fraseEsperada}`} error={errorEliminar} required>
            <TextField
              testID="eliminar-negocio-frase"
              value={frase}
              onChangeText={setFrase}
              placeholder={fraseEsperada}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </Field>
        ) : (
          <Text testID="eliminar-negocio-aviso" style={{ color: colores.textoSuave }}>
            {AVISO_DESACTIVAR_PRIMERO}
          </Text>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, padding: shSpace[3] },
  pestanas: { flexDirection: "row", borderBottomWidth: 1, marginBottom: shSpace[3] },
  pestana: { flex: 1, paddingVertical: 10, alignItems: "center" },
  fila: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  esqueletos: { gap: shSpace[2] },
  listaNegocios: { gap: shSpace[2], paddingBottom: shSpace[6] },
  tarjeta: {
    borderWidth: 1,
    borderRadius: shRadius.md,
    padding: shSpace[3],
    gap: shSpace[2],
  },
  tarjetaCabecera: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: shSpace[3],
  },
  tarjetaTextos: { flex: 1, gap: 2 },
  tarjetaPie: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[2],
  },
  planBoton: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[1],
    minHeight: shDensity.controlLg,
    paddingHorizontal: shSpace[1],
    borderRadius: shRadius.sm,
  },
  presionado: { opacity: 0.7 },
  acciones: { flexDirection: "row", alignItems: "center" },
  esqueletosPlan: { gap: shSpace[3] },
  errorPlan: { gap: shSpace[3] },
  detalle: { gap: shSpace[3] },
  filaDetalle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: shSpace[3],
    minHeight: 40,
  },
  valorDetalle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 1,
  },
});
