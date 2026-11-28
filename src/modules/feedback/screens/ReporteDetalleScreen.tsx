import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminApiError, crearClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { shRadius, shSpace, shType } from "@core/theme/tokens";
import { formatearFechaHora } from "@shared/domain/formato-clientes";
import { Badge, EmptyState, PageHeader, useKit } from "@shared/ui";
import { leerReporte, type FeedbackReporte } from "../api";
import { etiquetaDeArea, useCatalogoFeedback } from "../catalogo";
import { ESTADOS, MOTIVOS, estadoEnPalabras, etiquetaDeTipo } from "../textos";

export interface ReporteDetalleScreenProps {
  id: string;
  onBack(): void;
}

/**
 * Detalle de un reporte (HU-FB-07): las capturas llegan con URL firmada de 10 minutos, así que no
 * se guardan; si una deja de cargar, se vuelve a pedir el detalle (una vez) para firmarlas de nuevo.
 */
export function ReporteDetalleScreen({ id, onBack }: ReporteDetalleScreenProps) {
  const insets = useSafeAreaInsets();
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const catalogo = useCatalogoFeedback();
  const api = useMemo(() => crearClienteAdmin(sesion), [sesion]);
  const [reporte, setReporte] = useState<FeedbackReporte | null>(null);
  const [error, setError] = useState<{ titulo: string; texto: string } | null>(null);
  const refirmado = useRef(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setReporte(await leerReporte(api, id));
    } catch (e) {
      setError(
        e instanceof AdminApiError && e.status === 404
          ? { titulo: "Reporte no encontrado", texto: "No existe o no tienes acceso a él." }
          : { titulo: "No pudimos cargar el reporte", texto: "Revisa tu conexión y vuelve a intentarlo." },
      );
    }
  }, [api, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del detalle
    void cargar();
  }, [cargar]);

  const refirmar = () => {
    if (refirmado.current) return;
    refirmado.current = true;
    void cargar();
  };

  const catalogoListo = catalogo.estado === "listo" ? catalogo.catalogo : null;
  let cuerpo;
  if (error) {
    cuerpo = (
      <EmptyState
        testID="reporte-detalle-error"
        icon="error-outline"
        title={error.titulo}
        description={error.texto}
        action={{ label: "Reintentar", onPress: () => void cargar() }}
        secondaryAction={{ label: "Volver", onPress: onBack }}
      />
    );
  } else if (!reporte) {
    cuerpo = (
      <View style={styles.cargando} testID="reporte-detalle-cargando">
        <ActivityIndicator color={c.link} />
      </View>
    );
  } else {
    const info = ESTADOS[reporte.estado];
    cuerpo = (
      <ScrollView contentContainerStyle={styles.contenido} testID="reporte-detalle">
        <View style={styles.insignias}>
          <Badge testID="reporte-detalle-estado" tone={info.tono} icon={info.icono} label={info.etiqueta} size="md" />
          {reporte.motivo_codigo === "duplicado" ? (
            <Badge testID="reporte-detalle-duplicado" label="Duplicado" icon="content-copy" size="md" />
          ) : null}
        </View>
        <Text style={[shType.block, { color: c.text }]}>{reporte.titulo}</Text>
        <Text style={[shType.dense, { color: c.textMuted }]}>
          {etiquetaDeTipo(reporte.tipo)} · {etiquetaDeArea(catalogoListo, reporte.area)} · {formatearFechaHora(reporte.created_at)}
        </Text>

        {reporte.estado === "aprobado" && (reporte.creditos_otorgados ?? 0) > 0 ? (
          <View
            testID="reporte-detalle-creditos"
            style={[styles.caja, { backgroundColor: c.statusSuccessBg, borderColor: c.statusSuccessBorder }]}
          >
            <Text style={[shType.label, { color: c.statusSuccessFg }]}>{estadoEnPalabras(reporte)}</Text>
            <Text style={[shType.dense, { color: c.statusSuccessFg }]}>Ya están en el saldo de tu negocio.</Text>
          </View>
        ) : null}

        {reporte.estado === "rechazado" ? (
          <View
            testID="reporte-detalle-motivo"
            style={[styles.caja, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Text style={[shType.label, { color: c.text }]}>
              {reporte.motivo_codigo ? (MOTIVOS[reporte.motivo_codigo] ?? "Motivo del rechazo") : "Motivo del rechazo"}
            </Text>
            {reporte.motivo ? <Text style={[shType.body, { color: c.text }]}>{reporte.motivo}</Text> : null}
          </View>
        ) : null}

        <View style={styles.seccion}>
          <Text style={[shType.label, { color: c.text }]}>Descripción</Text>
          <Text style={[shType.body, { color: c.text }]} selectable>
            {reporte.descripcion}
          </Text>
        </View>

        {reporte.adjuntos.length > 0 ? (
          <View style={styles.seccion}>
            <Text style={[shType.label, { color: c.text }]}>Capturas</Text>
            {reporte.adjuntos
              .filter((adjunto) => adjunto.mimetype.startsWith("image/"))
              .map((adjunto, i) => (
                <Image
                  key={adjunto.id}
                  testID={`reporte-detalle-imagen-${i}`}
                  source={{ uri: adjunto.url }}
                  resizeMode="contain"
                  accessibilityLabel={`Captura ${i + 1}`}
                  onError={refirmar}
                  style={[styles.imagen, { backgroundColor: c.surface2, borderColor: c.border }]}
                />
              ))}
            {reporte.adjuntos.some((adjunto) => !adjunto.mimetype.startsWith("image/")) ? (
              <Text style={[shType.dense, { color: c.textMuted }]}>Los PDF se ven desde el panel web.</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <View testID="reporte-detalle-pantalla" style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <PageHeader testID="reporte-detalle-header" title="Reporte" onBack={onBack} />
      {cuerpo}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cargando: { flex: 1, alignItems: "center", justifyContent: "center" },
  contenido: { padding: shSpace[4], gap: shSpace[3], paddingBottom: shSpace[8] },
  insignias: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  caja: { padding: shSpace[3], gap: shSpace[1], borderRadius: shRadius.md, borderWidth: 1 },
  seccion: { gap: shSpace[2] },
  imagen: { width: "100%", aspectRatio: 9 / 16, maxHeight: 520, borderRadius: shRadius.md, borderWidth: 1 },
});
