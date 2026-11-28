import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AdminApiError, crearClienteAdmin } from "@core/api/admin";
import { useAdminSession } from "@core/session/admin-session-context";
import { shSpace, shType } from "@core/theme/tokens";
import { formatearFecha } from "@shared/domain/formato-clientes";
import { Badge, Card, Chip, EmptyState, PageHeader, useKit } from "@shared/ui";
import { listarReportes, type AlcanceReportes, type EstadoReporte, type FeedbackResumen } from "../api";
import { etiquetaDeArea, puedeVerDelNegocio, useCatalogoFeedback } from "../catalogo";
import { ESTADOS, estadoEnPalabras, etiquetaDeTipo } from "../textos";

export interface MisReportesScreenProps {
  onBack(): void;
  onAbrir(id: string): void;
  onNuevo(): void;
}

const FILTROS_ESTADO: { clave: EstadoReporte | null; etiqueta: string }[] = [
  { clave: null, etiqueta: "Todos" },
  { clave: "recibido", etiqueta: ESTADOS.recibido.etiqueta },
  { clave: "en_revision", etiqueta: ESTADOS.en_revision.etiqueta },
  { clave: "aprobado", etiqueta: ESTADOS.aprobado.etiqueta },
  { clave: "rechazado", etiqueta: ESTADOS.rechazado.etiqueta },
];

/** «Mis reportes» (HU-FB-07): estado, tipo, fecha y créditos; el owner puede ver los del negocio. */
export function MisReportesScreen({ onBack, onAbrir, onNuevo }: MisReportesScreenProps) {
  const insets = useSafeAreaInsets();
  const { c } = useKit();
  const { sesion } = useAdminSession();
  const catalogo = useCatalogoFeedback();
  const api = useMemo(() => crearClienteAdmin(sesion), [sesion]);
  const verNegocio = puedeVerDelNegocio(sesion);

  const [alcance, setAlcance] = useState<AlcanceReportes>("mios");
  const [estado, setEstado] = useState<EstadoReporte | null>(null);
  const [items, setItems] = useState<FeedbackResumen[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pedido = useRef(0);

  const cargar = useCallback(async () => {
    const n = ++pedido.current;
    setCargando(true);
    setError(null);
    try {
      const pagina = await listarReportes(api, { alcance, estado });
      if (n !== pedido.current) return;
      setItems(pagina.items);
      setCursor(pagina.next_cursor);
    } catch (e) {
      if (n !== pedido.current) return;
      if (e instanceof AdminApiError && e.status === 403 && alcance === "negocio") {
        setAlcance("mios");
        return;
      }
      setError(e instanceof AdminApiError ? e.message : "No pudimos cargar tus reportes. Revisa tu conexión.");
    } finally {
      if (n === pedido.current) setCargando(false);
    }
  }, [api, alcance, estado]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga al cambiar alcance o estado
    void cargar();
  }, [cargar]);

  const cargarMas = async () => {
    if (!cursor || masCargando || cargando) return;
    const n = pedido.current;
    setMasCargando(true);
    try {
      const pagina = await listarReportes(api, { alcance, estado, cursor });
      if (n !== pedido.current) return;
      setItems((actuales) => [...actuales, ...pagina.items]);
      setCursor(pagina.next_cursor);
    } catch {
      // La página siguiente se vuelve a pedir al llegar otra vez al final.
    } finally {
      setMasCargando(false);
    }
  };

  const catalogoListo = catalogo.estado === "listo" ? catalogo.catalogo : null;

  const filtros = (
    <View style={styles.filtros}>
      {verNegocio ? (
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Qué reportes ver">
          <Chip testID="reportes-alcance-mios" rol="radio" titulo="Míos" elegido={alcance === "mios"} onPress={() => setAlcance("mios")} />
          <Chip
            testID="reportes-alcance-negocio"
            rol="radio"
            titulo="Del negocio"
            elegido={alcance === "negocio"}
            onPress={() => setAlcance("negocio")}
          />
        </View>
      ) : null}
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Filtrar por estado">
        {FILTROS_ESTADO.map((filtro) => (
          <Chip
            key={filtro.clave ?? "todos"}
            testID={`reportes-estado-${filtro.clave ?? "todos"}`}
            rol="radio"
            titulo={filtro.etiqueta}
            elegido={estado === filtro.clave}
            onPress={() => setEstado(filtro.clave)}
          />
        ))}
      </View>
    </View>
  );

  return (
    <View testID="mis-reportes" style={[styles.pantalla, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <PageHeader
        testID="mis-reportes-header"
        title="Mis reportes"
        description="En qué va cada reporte y los créditos de regalo que ganaste."
        onBack={onBack}
      />
      <FlatList
        testID="mis-reportes-lista"
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contenido}
        ListHeaderComponent={filtros}
        refreshControl={<RefreshControl refreshing={cargando && items.length > 0} onRefresh={() => void cargar()} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => void cargarMas()}
        ListEmptyComponent={
          cargando ? (
            <View style={styles.cargando} testID="mis-reportes-cargando">
              <ActivityIndicator color={c.link} />
            </View>
          ) : error ? (
            <EmptyState
              testID="mis-reportes-error"
              icon="wifi-off"
              title="No pudimos cargar tus reportes"
              description={error}
              action={{ label: "Reintentar", onPress: () => void cargar() }}
            />
          ) : (
            <EmptyState
              testID="mis-reportes-vacio"
              icon="feedback"
              title={estado ? "No hay reportes con este estado" : "Aún no has enviado reportes"}
              description="Cuéntanos un error, una mejora o una idea. Si lo aprobamos, tu negocio recibe créditos de regalo."
              action={{ label: "Reportar un problema", onPress: onNuevo }}
            />
          )
        }
        ListFooterComponent={masCargando ? <ActivityIndicator color={c.link} style={styles.mas} /> : undefined}
        renderItem={({ item }) => {
          const info = ESTADOS[item.estado];
          return (
            <Card
              testID={`reporte-${item.id}`}
              onPress={() => onAbrir(item.id)}
              accessibilityLabel={`${item.titulo}. ${estadoEnPalabras(item)}`}
              accessibilityHint="Abre el detalle del reporte"
            >
              <View style={styles.fila}>
                <Text style={[shType.label, styles.titulo, { color: c.text }]} numberOfLines={2}>
                  {item.titulo}
                </Text>
                <Badge tone={info.tono} icon={info.icono} label={info.etiqueta} />
              </View>
              <Text style={[shType.dense, { color: c.textMuted }]}>
                {etiquetaDeTipo(item.tipo)} · {etiquetaDeArea(catalogoListo, item.area)} · {formatearFecha(item.created_at)}
              </Text>
              {item.estado === "aprobado" && (item.creditos_otorgados ?? 0) > 0 ? (
                <Text testID={`reporte-${item.id}-creditos`} style={[shType.dense, { color: c.statusSuccessFg }]}>
                  {estadoEnPalabras(item)}
                </Text>
              ) : null}
              {item.motivo_codigo === "duplicado" ? (
                <Badge testID={`reporte-${item.id}-duplicado`} label="Duplicado" icon="content-copy" />
              ) : null}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { padding: shSpace[4], gap: shSpace[3], paddingBottom: shSpace[8] },
  filtros: { gap: shSpace[2], marginBottom: shSpace[2] },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: shSpace[2] },
  cargando: { paddingVertical: shSpace[8], alignItems: "center" },
  fila: { flexDirection: "row", alignItems: "flex-start", gap: shSpace[2] },
  titulo: { flex: 1 },
  mas: { marginVertical: shSpace[4] },
});
