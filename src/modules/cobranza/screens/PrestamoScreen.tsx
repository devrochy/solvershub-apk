import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { Button, useKit, type KitTema } from "@shared/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus } from "@core/api/client";
import { CargaError } from "../components/CargaError";
import { HeaderApp } from "../components/HeaderApp";
import {
  enlaceWhatsApp,
} from "../features/estado-cuenta/estado-cuenta";
import { clasificarCuotas, TipoCuotaCanvas } from "../features/prestamo/canvas-cuotas";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import type { EstadoCuentaPrestamoPublic } from "@shared/types/gestor";

type Props = NativeStackScreenProps<RootStackParamList, "Prestamo">;

/**
 * Colores del canvas con los tonos de estado del tema activo (HU-DS-10).
 * `borde` también colorea la etiqueta, así que son los `statusXFg` (AA).
 */
function coloresCanvas({ c, tonos }: KitTema): Record<TipoCuotaCanvas, { fondo: string; borde: string }> {
  return {
    pagada: { fondo: tonos.success.bg, borde: tonos.success.fg },
    actual: { fondo: tonos.info.bg, borde: tonos.info.fg },
    en_mora: { fondo: tonos.danger.bg, borde: tonos.danger.fg },
    futura: { fondo: c.surface2, borde: c.textMuted },
    abonada: { fondo: tonos.warning.bg, borde: tonos.warning.fg },
  };
}

const ETIQUETA: Record<TipoCuotaCanvas, string> = {
  pagada: "Pagada",
  actual: "Cuota actual",
  en_mora: "En mora",
  futura: "Futura",
  abonada: "Abonada",
};

const LEYENDA: { tipo: TipoCuotaCanvas; texto: string }[] = [
  { tipo: "pagada", texto: "Pagada" },
  { tipo: "actual", texto: "Cuota actual" },
  { tipo: "en_mora", texto: "En mora" },
  { tipo: "futura", texto: "Futura" },
];

export function PrestamoScreen({ route }: Props) {
  const { carteraId, prestamoId, clienteNombre, telefonoWhatsapp, valor, numCuotas } =
    route.params;
  const { api, logout } = useSession();
  const kit = useKit();
  const styles = useMemo(() => crearEstilos(kit), [kit]);
  const COLORES = useMemo(() => coloresCanvas(kit), [kit]);
  const [estado, setEstado] = useState<EstadoCuentaPrestamoPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setEstado(await api.obtenerEstadoCuentaPrestamo(carteraId, prestamoId));
    } catch (err) {
      if (apiErrorStatus(err) === 401) {
        await logout();
      } else {
        setError("No se pudo cargar el estado del préstamo.");
      }
    }
  }, [api, logout, carteraId, prestamoId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount (async; no setState síncrono)
    cargar();
  }, [cargar]);

  if (!estado) {
    return <CargaError cargando={!error} error={error} onReintentar={cargar} />;
  }

  const cuotas = clasificarCuotas(estado.cuotas);

  return (
    <SafeAreaView style={styles.contenedor} edges={["left", "right", "bottom"]}>
      <HeaderApp titulo="Estado de cuenta" subtitulo={`Préstamo #${prestamoId}`} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido}>
        <View style={styles.tarjetaResumen}>
          <Text accessibilityRole="header" style={styles.clienteNombre}>{clienteNombre}</Text>
          <Text style={styles.clienteDetalle}>
            Préstamo: {valor} {estado.moneda} · {numCuotas} cuotas ·{" "}
            {estado.tipoInteres}% interés
          </Text>
          <View style={styles.filaResumen}>
            <Text style={styles.resumenValor}>Abonos totales: {estado.totalAbonos} {estado.moneda}</Text>
            <Text style={styles.resumenSaldo}>Saldo: {estado.saldoPendiente} {estado.moneda}</Text>
          </View>
        </View>

        <View style={styles.leyenda}>
          {LEYENDA.map((l) => (
            <View key={l.tipo} style={styles.leyendaItem}>
              <View style={[styles.leyendaColor, { backgroundColor: COLORES[l.tipo].borde }]} />
              <Text style={styles.leyendaTexto}>{l.texto}</Text>
            </View>
          ))}
        </View>

        <View style={styles.canvas}>
          {cuotas.map((cuota) => {
            const color = COLORES[cuota.tipo];
            return (
              <Pressable
                key={cuota.cuotaId}
                testID={`cuota-${cuota.numeroCuota}`}
                style={[styles.cuadro, { backgroundColor: color.fondo, borderColor: color.borde }]}
              >
                <Text style={styles.cuadroNumero}>{cuota.numeroCuota}</Text>
                <Text style={styles.cuadroValor}>
                  {cuota.valorEsperado} {estado.moneda}
                </Text>
                <Text style={styles.cuadroFecha}>{cuota.fechaVencimiento}</Text>
                {cuota.saldoPendiente > 0 && cuota.saldoPendiente < cuota.valorEsperado ? (
                  <Text style={styles.cuadroSaldo}>Falta: {cuota.saldoPendiente} {estado.moneda}</Text>
                ) : null}
                {cuota.abonosAcumulados > 0 ? (
                  <Text style={styles.cuadroAbono}>Abonado: {cuota.abonosAcumulados} {estado.moneda}</Text>
                ) : null}
                <View style={[styles.cuadroEtiqueta, { borderColor: color.borde }]}>
                  <Text style={[styles.cuadroEtiquetaTexto, { color: color.borde }]}>
                    {ETIQUETA[cuota.tipo]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button
          testID="btn-whatsapp-canvas"
          size="lg"
          iconLeft="chat"
          fullWidth
          onPress={() => {
            const texto = [
              `Estado de cuenta de ${estado.nombreCliente}`,
              `Préstamo ${estado.prestamoId} — ${estado.valor} ${estado.moneda}, ${estado.numCuotas} cuotas`,
              ...estado.cuotas.map(
                (c) =>
                  `Cuota ${c.numeroCuota} (${c.fechaVencimiento}): ${c.valorEsperado} ${estado.moneda} - ${c.estatus} - saldo ${c.saldoPendiente}`,
              ),
              `Abonos totales: ${estado.totalAbonos} ${estado.moneda}`,
              `Saldo pendiente: ${estado.saldoPendiente} ${estado.moneda}`,
            ].join("\n");
            void Linking.openURL(enlaceWhatsApp(telefonoWhatsapp, texto));
          }}
        >
          Enviar por WhatsApp
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

function crearEstilos({ c }: KitTema) {
  return StyleSheet.create({
    contenedor: { flex: 1, backgroundColor: c.bg },
    scroll: { flex: 1, backgroundColor: c.bg },
    contenido: { padding: shSpace[4], gap: 14 },
    tarjetaResumen: {
      backgroundColor: c.surface,
      borderRadius: shRadius.md,
      padding: shSpace[4],
      borderWidth: 1,
      borderColor: c.border,
    },
    clienteNombre: { ...shType.block, fontFamily: shType.hero.fontFamily, color: c.text },
    clienteDetalle: { ...shType.dense, color: c.textMuted, marginTop: shSpace[1] },
    filaResumen: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: shSpace[2], marginTop: shSpace[3] },
    resumenValor: { ...shType.label, color: c.textMuted, fontVariant: ["tabular-nums"] },
    resumenSaldo: { ...shType.label, fontFamily: shType.hero.fontFamily, color: c.link, fontVariant: ["tabular-nums"] },
    leyenda: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[3] },
    leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    leyendaColor: { width: 12, height: 12, borderRadius: shRadius.pill },
    leyendaTexto: { ...shType.caption, color: c.textMuted },
    canvas: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    cuadro: {
      width: "22%",
      borderRadius: shRadius.sm,
      borderWidth: 1,
      padding: shSpace[2],
      alignItems: "center",
      gap: 2,
    },
    cuadroNumero: { ...shType.block, fontFamily: shType.hero.fontFamily, color: c.text },
    cuadroValor: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: c.textMuted, fontVariant: ["tabular-nums"] },
    cuadroFecha: { ...shType.caption, fontSize: 11, color: c.textMuted },
    cuadroAbono: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: c.statusSuccessFg },
    cuadroSaldo: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 11, color: c.link },
    cuadroEtiqueta: {
      borderWidth: 1,
      borderRadius: shRadius.pill,
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginTop: 2,
    },
    cuadroEtiquetaTexto: { ...shType.caption, fontFamily: shType.label.fontFamily, fontSize: 10, lineHeight: 14 },
  });
}
