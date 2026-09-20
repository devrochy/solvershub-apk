import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { apiErrorStatus } from "../api/client";
import { CargaError } from "../components/CargaError";
import {
  enlaceWhatsApp,
  textoReportePrestamo,
} from "../features/estado-cuenta/estado-cuenta";
import { clasificarCuotas, TipoCuotaCanvas } from "../features/prestamo/canvas-cuotas";
import type { RootStackParamList } from "../navigation/types";
import { useSession } from "../session/session-context";
import { useTheme } from "../theme/theme-context";
import type { ColoresTema } from "../theme/theme";
import type { EstadoCuentaPrestamoPublic } from "../types/gestor";

type Props = NativeStackScreenProps<RootStackParamList, "Prestamo">;

const COLORES: Record<TipoCuotaCanvas, { fondo: string; borde: string }> = {
  pagada: { fondo: "#dcfce7", borde: "#16a34a" },
  actual: { fondo: "#dbeafe", borde: "#172f6c" },
  en_mora: { fondo: "#fee2e2", borde: "#dc2626" },
  futura: { fondo: "#f1f5f9", borde: "#cbd5e1" },
  abonada: { fondo: "#fef9c3", borde: "#d97706" },
};

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
  const { colores } = useTheme();
  const styles = useMemo(() => crearEstilos(colores), [colores]);
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido}>
      <View style={styles.tarjetaResumen}>
        <Text style={styles.clienteNombre}>{clienteNombre}</Text>
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

      <Pressable
        testID="btn-whatsapp-canvas"
        style={styles.botonWhatsApp}
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
        <Text style={styles.botonWhatsAppTexto}>Enviar por WhatsApp</Text>
      </Pressable>
    </ScrollView>
  );
}

function crearEstilos(c: ColoresTema) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.fondo },
    contenido: { padding: 16, gap: 14 },
    tarjetaResumen: {
      backgroundColor: c.tarjeta,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: c.borde,
    },
    clienteNombre: { fontSize: 18, fontWeight: "700", color: c.texto },
    clienteDetalle: { color: c.textoSuave, fontSize: 13, marginTop: 4 },
    filaResumen: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
    resumenValor: { fontSize: 14, fontWeight: "600", color: c.textoSuave },
    resumenSaldo: { fontSize: 14, fontWeight: "700", color: c.acento },
    leyenda: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    leyendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    leyendaColor: { width: 12, height: 12, borderRadius: 999 },
    leyendaTexto: { color: c.textoSuave, fontSize: 12 },
    canvas: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    cuadro: {
      width: "22%",
      borderRadius: 8,
      borderWidth: 1,
      padding: 8,
      alignItems: "center",
      gap: 2,
    },
    cuadroNumero: { fontSize: 16, fontWeight: "700", color: c.texto },
    cuadroValor: { fontSize: 11, color: c.textoSuave, fontWeight: "600" },
    cuadroFecha: { fontSize: 9, color: c.textoSuave },
    cuadroAbono: { fontSize: 9, color: "#16a34a", fontWeight: "600" },
    cuadroSaldo: { fontSize: 9, color: c.acento, fontWeight: "600" },
    cuadroEtiqueta: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 1,
      marginTop: 2,
    },
    cuadroEtiquetaTexto: { fontSize: 9, fontWeight: "600" },
    botonWhatsApp: {
      backgroundColor: "#16a34a",
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    botonWhatsAppTexto: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  });
}