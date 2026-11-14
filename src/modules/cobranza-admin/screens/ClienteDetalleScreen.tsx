import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAdminApi } from "@core/session/use-admin-api";
import { useAdminSession } from "@core/session/admin-session-context";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  TextField,
  useKit,
  useToast,
  type IconName,
} from "@shared/ui";
import {
  enlaceTelefono,
  enlaceWhatsApp,
  etiquetaRiesgo,
  etiquetaTipoDocumento,
  formatearCop,
  formatearFecha,
  tonoDeRiesgo,
} from "@shared/domain/formato-clientes";
import {
  cargarCarteras,
  cargarDetalleCliente,
  decidirCambioCliente,
  eliminarAbono,
  eliminarCliente,
  type ClientChange,
  type ClientDetail,
  type CuotaOut,
  type Loan,
  type PortfolioRow,
} from "../api";
import type { CobranzaAdminStackParamList } from "../navigation";
import { ClienteFormSheet } from "../components/ClienteFormSheet";
import { CuotaSheet, MovimientoSheet, PrestamoSheet } from "../components/PrestamoSheets";

type Props = NativeStackScreenProps<CobranzaAdminStackParamList, "ClienteDetalle">;

const RIESGO_ICONO: Record<string, IconName> = {
  blanco: "check-circle",
  azul: "info",
  rojo: "warning",
};

/** Ficha del cliente de cartera: datos, préstamos, pagos, cuotas y cambios propuestos. */
export function ClienteDetalleScreen({ route, navigation }: Props) {
  const { c, tonos } = useKit();
  const api = useAdminApi();
  const toast = useToast();
  const { sesion } = useAdminSession();
  const esMaster = sesion?.role === "master";
  const puedeEscribir = esMaster || sesion?.permissions?.["pack_cobranza:clientes"] === "write";
  const { id } = route.params;

  const [detalle, setDetalle] = useState<ClientDetail | null>(null);
  const [carteras, setCarteras] = useState<PortfolioRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [prestamoAbierto, setPrestamoAbierto] = useState(false);
  const [movimiento, setMovimiento] = useState<{ prestamo: Loan; tipo: "pago" | "abono" } | null>(null);
  const [cuota, setCuota] = useState<CuotaOut | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    try {
      setDetalle(await cargarDetalleCliente(api, id));
      setError(null);
    } catch {
      setError("No pudimos cargar la ficha del cliente.");
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial: setState tras el await
    void cargar().finally(() => setCargando(false));
  }, [cargar]);

  useEffect(() => {
    cargarCarteras(api)
      .then((lista) => setCarteras(Array.isArray(lista) ? lista : []))
      .catch(() => undefined);
  }, [api]);

  const resumen = useMemo(() => {
    const prestamos = detalle?.prestamos ?? [];
    const saldoTotal = prestamos.reduce((total, prestamo) => total + Number(prestamo.saldo ?? 0), 0);
    const cuotas = prestamos.reduce(
      (total, prestamo) =>
        total +
        prestamo.cuotas.filter((item) => (item.estatus ?? item.estado) !== "pagada").length,
      0,
    );
    return { prestamos: prestamos.length, saldoTotal, cuotas };
  }, [detalle]);

  const decidir = (cambio: ClientChange, decision: "aprobar" | "rechazar") => {
    Alert.alert(
      `${decision === "aprobar" ? "Aprobar" : "Rechazar"} cambio`,
      decision === "aprobar"
        ? "Los datos propuestos se aplicarán al cliente."
        : "El cambio propuesto quedará rechazado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            void decidirCambioCliente(api, cambio.id, decision, motivoRechazo[cambio.id] ?? "")
              .then(() => {
                toast.success(decision === "aprobar" ? "Cambio aprobado." : "Cambio rechazado.");
                return cargar();
              })
              .catch(() => setError("No se pudo decidir el cambio."));
          },
        },
      ],
    );
  };

  const eliminarClienteActual = () => {
    if (!detalle) return;
    const nombre = `${detalle.cliente.nombre} ${detalle.cliente.apellido ?? ""}`.trim() || "este cliente";
    Alert.alert("Eliminar cliente", `¿Eliminar a ${nombre}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarCliente(api, detalle.cliente.id)
            .then(() => {
              toast.success(`${nombre} quedó eliminado.`);
              navigation.goBack();
            })
            .catch(() => setError("No se pudo eliminar el cliente."));
        },
      },
    ]);
  };

  const eliminarUnAbono = (abonoId: string) => {
    Alert.alert("Eliminar abono", "¿Eliminar este abono del estado de cuenta?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          void eliminarAbono(api, abonoId)
            .then(() => {
              toast.success("Abono eliminado.");
              return cargar();
            })
            .catch(() => setError("No se pudo eliminar el abono."));
        },
      },
    ]);
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.link} />
      </View>
    );
  }

  if (!detalle) {
    return (
      <View style={[styles.centro, { backgroundColor: c.bg }]}>
        <EmptyState
          icon="person-off"
          title="No pudimos abrir el cliente"
          description={error ?? "Intenta de nuevo."}
          action={{ label: "Reintentar", onPress: () => void cargar() }}
        />
      </View>
    );
  }

  const cliente = detalle.cliente;
  const nombre = `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() || "Cliente";
  const telefono = cliente.telefono ?? "—";
  const whatsapp = enlaceWhatsApp(telefono, nombre);
  const llamar = enlaceTelefono(telefono);
  const riesgo = tonoDeRiesgo(cliente.color_riesgo);
  const riesgoTono = tonos[riesgo];
  const riesgoIcono = RIESGO_ICONO[cliente.color_riesgo] ?? "help-outline";

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.contenedor}>
      {error ? (
        <Text testID="detalle-error" style={[styles.error, { color: c.statusDangerFg }]}>
          {error}
        </Text>
      ) : null}

      <Card testID="cobranza-cliente-cabecera" accentColor={riesgoTono.border}>
        <View style={styles.cabecera}>
          <Avatar name={nombre} size="lg" />
          <View style={styles.cabeceraTexto}>
            <Text style={[styles.nombre, { color: c.text }]}>{nombre}</Text>
            <BadgeDeRiesgo tone={riesgo} icon={riesgoIcono} label={etiquetaRiesgo(cliente.color_riesgo)} />
            <Text style={[styles.subtitulo, { color: c.textMuted }]}>
              {cliente.cartera || "Sin cartera"} · {etiquetaTipoDocumento(cliente.tipo_documento)}{" "}
              {cliente.numero_documento || "—"}
            </Text>
            <Text style={[styles.subtitulo, { color: c.textMuted }]}>{telefono}</Text>
            {cliente.negocio ? (
              <Text style={[styles.subtitulo, { color: c.textMuted }]}>{cliente.negocio}</Text>
            ) : null}
            {Number(cliente.tope_maximo_deuda ?? 0) > 0 ? (
              <Text style={[styles.subtitulo, { color: c.textMuted }]}>
                Tope de deuda: {formatearCop(cliente.tope_maximo_deuda)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.accionesCabecera}>
          {whatsapp ? (
            <Button
              testID="detalle-whatsapp"
              variant="secondary"
              size="sm"
              iconLeft="chat"
              onPress={() => void Linking.openURL(whatsapp).catch(() => undefined)}
            >
              WhatsApp
            </Button>
          ) : null}
          {llamar ? (
            <Button
              testID="detalle-llamar"
              variant="secondary"
              size="sm"
              iconLeft="call"
              onPress={() => void Linking.openURL(llamar).catch(() => undefined)}
            >
              Llamar
            </Button>
          ) : null}
          {puedeEscribir ? (
            <Button testID="detalle-editar" variant="secondary" size="sm" iconLeft="edit" onPress={() => setFormAbierto(true)}>
              Editar
            </Button>
          ) : null}
          {puedeEscribir ? (
            <Button testID="detalle-eliminar" variant="danger" size="sm" iconLeft="delete-outline" onPress={eliminarClienteActual}>
              Eliminar
            </Button>
          ) : null}
        </View>
      </Card>

      <View style={styles.stats}>
        <StatCard titulo="Préstamos" valor={String(resumen.prestamos)} />
        <StatCard titulo="Saldo total" valor={formatearCop(resumen.saldoTotal)} />
        <StatCard
          titulo="Cuotas por pagar"
          valor={String(resumen.cuotas)}
          tono={resumen.cuotas > 0 ? "warning" : "success"}
        />
      </View>

      {puedeEscribir ? (
        <Button testID="detalle-nuevo-prestamo" iconLeft="add" onPress={() => setPrestamoAbierto(true)}>
          Nuevo préstamo
        </Button>
      ) : null}

      {detalle.cambios.filter((cambio) => cambio.estado === "pendiente").length > 0 ? (
        <View style={styles.seccion}>
          <Text style={[styles.tituloSeccion, { color: c.text }]}>Cambios propuestos</Text>
          {detalle.cambios
            .filter((cambio) => cambio.estado === "pendiente")
            .map((cambio) => (
              <Card key={cambio.id} testID={`cambio-${cambio.id}`} accentColor={c.statusWarningFg}>
                <View style={styles.filaEntre}>
                  <Badge size="sm" tone="warning" icon="schedule" label="Pendiente" />
                  <Text style={[styles.caption, { color: c.textMuted }]}>
                    {formatearFecha(cambio.fecha)} · {cambio.solicitado_por ?? "—"}
                  </Text>
                </View>
                {Object.entries(cambio.campos_propuestos).map(([campo, valor]) => (
                  <Text key={campo} style={[styles.dense, { color: c.text }]}>
                    <Text style={{ color: c.textMuted }}>{campo}: </Text>
                    {String(valor)}
                  </Text>
                ))}
                <TextField
                  testID={`motivo-rechazo-${cambio.id}`}
                  accessibilityLabel="Motivo del rechazo"
                  placeholder="Motivo (para rechazar)"
                  value={motivoRechazo[cambio.id] ?? ""}
                  onChangeText={(texto) =>
                    setMotivoRechazo((previos) => ({ ...previos, [cambio.id]: texto }))
                  }
                  maxLength={200}
                />
                <View style={styles.accionesCambio}>
                  <Button testID={`aprobar-${cambio.id}`} size="sm" onPress={() => decidir(cambio, "aprobar")}>
                    Aprobar
                  </Button>
                  <Button
                    testID={`rechazar-${cambio.id}`}
                    variant="secondary"
                    size="sm"
                    onPress={() => decidir(cambio, "rechazar")}
                  >
                    Rechazar
                  </Button>
                </View>
              </Card>
            ))}
        </View>
      ) : null}

      <View style={styles.seccion}>
        <Text style={[styles.tituloSeccion, { color: c.text }]}>Préstamos ({detalle.prestamos.length})</Text>
        {detalle.prestamos.length === 0 ? (
          <Text style={[styles.vacio, { color: c.textMuted }]}>
            Sin préstamos. Crea el primero con «Nuevo préstamo».
          </Text>
        ) : (
          detalle.prestamos.map((prestamo) => (
            <Card key={prestamo.id} testID={`detalle-prestamo-${prestamo.id}`}>
              <View style={styles.filaEntre}>
                <Text style={[styles.tituloPrestamo, { color: c.text }]}>
                  {formatearCop(prestamo.valor)} · {prestamo.num_cuotas} cuotas
                </Text>
                <Badge
                  size="sm"
                  tone={prestamo.estatus === "vigente" ? "success" : "neutral"}
                  icon={prestamo.estatus === "vigente" ? "check-circle" : "info"}
                  label={prestamo.estatus}
                />
              </View>
              <Text style={[styles.dense, { color: c.textMuted }]}>
                Otorgado {formatearFecha(prestamo.fecha_otorgado)} · interés {prestamo.tipo_interes}%
              </Text>
              <Text style={[styles.saldo, { color: c.text }]}>Saldo {formatearCop(prestamo.saldo)}</Text>

              {prestamo.cuotas.length > 0 ? (
                <View style={styles.cuotas}>
                  {prestamo.cuotas.map((item) => (
                    <Button
                      key={item.id}
                      testID={`detalle-cuota-${item.id}`}
                      variant="secondary"
                      size="sm"
                      onPress={() => setCuota(item)}
                    >
                      {`#${item.numero} · ${formatearFecha(item.vence ?? item.fecha_vencimiento)} · ${formatearCop(item.valor ?? item.monto)}`}
                    </Button>
                  ))}
                </View>
              ) : (
                <Text style={[styles.caption, { color: c.textMuted }]}>Sin plan de cuotas.</Text>
              )}

              {prestamo.cuotas.length > 0 ? (
                <Text style={[styles.caption, { color: c.textMuted }]}>
                  {prestamo.cuotas.filter((item) => (item.estatus ?? item.estado) === "pagada").length} de{" "}
                  {prestamo.num_cuotas} cuotas pagadas
                </Text>
              ) : null}

              {puedeEscribir ? (
                <View style={styles.accionesPrestamo}>
                  <Button
                    testID={`detalle-pago-${prestamo.id}`}
                    variant="secondary"
                    size="sm"
                    onPress={() => setMovimiento({ prestamo, tipo: "pago" })}
                  >
                    Pago
                  </Button>
                  <Button
                    testID={`detalle-abono-${prestamo.id}`}
                    variant="secondary"
                    size="sm"
                    onPress={() => setMovimiento({ prestamo, tipo: "abono" })}
                  >
                    Abono
                  </Button>
                </View>
              ) : null}
            </Card>
          ))
        )}
      </View>

      <View style={styles.seccion}>
        <Text style={[styles.tituloSeccion, { color: c.text }]}>Movimientos</Text>
        {detalle.movimientos.length === 0 ? (
          <Text style={[styles.vacio, { color: c.textMuted }]}>
            Los pagos y abonos registrados aparecerán aquí.
          </Text>
        ) : (
          detalle.movimientos.map((movimiento) => (
            <View
              key={movimiento.id}
              testID={`detalle-movimiento-${movimiento.id}`}
              style={[styles.movimiento, { borderColor: c.borderSoft, backgroundColor: c.surface }]}
            >
              <View style={styles.flex}>
                <View style={styles.filaEntre}>
                  <Badge
                    size="sm"
                    tone={movimiento.tipo === "pago" ? "success" : "accent"}
                    icon={movimiento.tipo === "pago" ? "check-circle" : "add-circle"}
                    label={movimiento.tipo}
                  />
                  <Text style={[styles.caption, { color: c.textMuted }]}>{movimiento.fecha}</Text>
                </View>
                <Text style={[styles.dense, { color: c.textMuted }]}>
                  {movimiento.metodo || "—"}
                </Text>
              </View>
              <View style={styles.derechaMovimiento}>
                <Text style={[styles.valorMovimiento, { color: c.text }]}>
                  {formatearCop(movimiento.valor)}
                </Text>
                {movimiento.tipo === "abono" && puedeEscribir ? (
                  <Button
                    testID={`detalle-eliminar-abono-${movimiento.id}`}
                    variant="link"
                    size="sm"
                    onPress={() => eliminarUnAbono(movimiento.id)}
                  >
                    Eliminar
                  </Button>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      <ClienteFormSheet
        visible={formAbierto}
        onClose={() => setFormAbierto(false)}
        carteras={carteras}
        cliente={cliente}
        onGuardado={() => {
          toast.success("Cliente actualizado.");
          void cargar();
        }}
      />
      <PrestamoSheet
        visible={prestamoAbierto}
        onClose={() => setPrestamoAbierto(false)}
        clienteId={cliente.id}
        onCreado={() => {
          toast.success("Préstamo creado.");
          void cargar();
        }}
      />
      {movimiento ? (
        <MovimientoSheet
          visible
          onClose={() => setMovimiento(null)}
          prestamo={movimiento.prestamo}
          tipo={movimiento.tipo}
          onGuardado={() => {
            toast.success(movimiento.tipo === "pago" ? "Pago registrado." : "Abono registrado.");
            void cargar();
          }}
        />
      ) : null}
      {cuota ? (
        <CuotaSheet
          visible
          onClose={() => setCuota(null)}
          cuota={cuota}
          onGuardado={() => {
            toast.success("Cuota actualizada.");
            void cargar();
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function StatCard({ titulo, valor, tono }: { titulo: string; valor: string; tono?: "success" | "warning" }) {
  const { c, tonos } = useKit();
  return (
    <View style={[styles.stat, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <Text style={[styles.statValor, { color: tono ? tonos[tono].fg : c.text }]}>{valor}</Text>
      <Text style={[styles.caption, { color: c.textMuted }]}>{titulo}</Text>
    </View>
  );
}

function BadgeDeRiesgo({
  tone,
  icon,
  label,
}: {
  tone: ReturnType<typeof tonoDeRiesgo>;
  icon: IconName;
  label: string;
}) {
  if (tone === "neutral") return <Badge size="sm" tone="neutral" icon={icon} label={label} testID="detalle-riesgo" />;
  return <Badge size="sm" tone={tone} icon={icon} label={label} testID="detalle-riesgo" />;
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenedor: { padding: 16, gap: 12, paddingBottom: 40 },
  error: { fontSize: 13 },
  cabecera: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cabeceraTexto: { flex: 1, gap: 4, alignItems: "flex-start" },
  nombre: { fontSize: 20, lineHeight: 26, fontWeight: "700" },
  subtitulo: { fontSize: 13, lineHeight: 18 },
  accionesCabecera: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  stats: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 12, gap: 2 },
  statValor: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
  seccion: { gap: 8 },
  tituloSeccion: { fontSize: 15, lineHeight: 20, fontWeight: "700" },
  vacio: { fontSize: 13, lineHeight: 18 },
  filaEntre: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  caption: { fontSize: 12, lineHeight: 16 },
  dense: { fontSize: 13, lineHeight: 18 },
  tituloPrestamo: { fontSize: 14, lineHeight: 20, fontWeight: "600", flexShrink: 1 },
  saldo: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
  cuotas: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  accionesPrestamo: { flexDirection: "row", gap: 8, marginTop: 4 },
  accionesCambio: { flexDirection: "row", gap: 8, marginTop: 4 },
  movimiento: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  flex: { flex: 1 },
  derechaMovimiento: { alignItems: "flex-end", gap: 2 },
  valorMovimiento: { fontSize: 15, lineHeight: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
