import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, EmptyState, Skeleton, useKit } from "@shared/ui";
import { listarEscalaciones, type EscalationItem } from "../api";
import { nombreDelChat } from "../presentacion";
import { FiltrosEscalaciones } from "./FiltrosEscalaciones";
import { ResumenEscalacionSheet } from "./ResumenEscalacionSheet";
import { TarjetaEscalacion } from "./TarjetaEscalacion";

function EsqueletoEscalacion() {
  const { c } = useKit();
  return (
    <View style={[styles.esqueleto, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <Skeleton shape="circle" height={40} />
      <View style={styles.esqueletoTexto}>
        <Skeleton width="45%" height={14} />
        <Skeleton width="70%" height={12} />
        <Skeleton width="55%" height={10} />
      </View>
    </View>
  );
}

/** Pestaña Escalaciones: filtro por motivo, tarjetas y resumen completo. */
export function PestanaEscalaciones({
  onAbrirConversacion,
  onVerConversaciones,
}: {
  onAbrirConversacion: (id: string, titulo: string) => void;
  onVerConversaciones: () => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const [motivo, setMotivo] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<EscalationItem[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<EscalationItem | null>(null);

  const montado = useRef(true);
  const motivoRef = useRef(motivo);
  const paginaRef = useRef(1);
  const hayMasRef = useRef(false);
  const cargandoMasRef = useRef(false);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);
  useEffect(() => {
    motivoRef.current = motivo;
  }, [motivo]);

  const cargar = useCallback(
    async (paginaPedida: number, modo: "inicial" | "refresco" | "mas") => {
      if (modo === "mas") {
        if (cargandoMasRef.current || !hayMasRef.current) return;
        cargandoMasRef.current = true;
        setCargandoMas(true);
      } else if (modo === "inicial") {
        setCargando(true);
      } else {
        setRefrescando(true);
      }

      const motivoAlPedir = motivo;
      try {
        const resultado = await listarEscalaciones(api, {
          page: paginaPedida,
          reason_code: motivo,
        });
        if (!montado.current || motivoAlPedir !== motivoRef.current) return;
        setError(null);
        if (paginaPedida === 1) {
          setItems(resultado.items);
          paginaRef.current = 1;
        } else {
          setItems((actuales) => {
            const porId = new Map(actuales.map((e) => [`${e.conversation_id}-${e.created_at}`, e]));
            for (const item of resultado.items) {
              porId.set(`${item.conversation_id}-${item.created_at}`, item);
            }
            return [...porId.values()];
          });
          paginaRef.current = resultado.page;
        }
        setHayMas(resultado.has_more);
        hayMasRef.current = resultado.has_more;
      } catch {
        if (montado.current && motivoAlPedir === motivoRef.current) {
          setError("No pudimos cargar las escalaciones. Revisa tu conexión.");
        }
      } finally {
        const vigente = montado.current && motivoAlPedir === motivoRef.current;
        if (modo === "mas") {
          cargandoMasRef.current = false;
          if (montado.current) setCargandoMas(false);
        } else if (modo === "inicial") {
          if (vigente) setCargando(false);
        } else {
          if (montado.current) setRefrescando(false);
        }
      }
    },
    [api, motivo],
  );

  useEffect(() => {
    paginaRef.current = 1;
    hayMasRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial al cambiar el motivo
    void cargar(1, "inicial");
  }, [cargar]);

  const cargarMas = useCallback(() => {
    void cargar(paginaRef.current + 1, "mas");
  }, [cargar]);

  const abrir = (item: EscalationItem) =>
    onAbrirConversacion(item.conversation_id, nombreDelChat(item));

  if (cargando) {
    return (
      <View>
        <FiltrosEscalaciones motivo={motivo} onChange={setMotivo} />
        <View testID="escalaciones-cargando" accessibilityState={{ busy: true }} style={styles.lista}>
          {[0, 1, 2].map((i) => (
            <EsqueletoEscalacion key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <FiltrosEscalaciones motivo={motivo} onChange={setMotivo} />

      {error && items.length > 0 ? (
        <View style={[styles.aviso, { backgroundColor: c.statusDangerBg, borderColor: c.statusDangerBorder }]}>
          <Text accessibilityLiveRegion="polite" style={[shType.caption, { color: c.statusDangerFg }]}>
            {error}
          </Text>
          <Button variant="link" size="sm" onPress={() => void cargar(1, "refresco")}>
            Reintentar
          </Button>
        </View>
      ) : null}

      <FlatList
        testID="lista-escalaciones"
        data={items}
        keyExtractor={(item) => `${item.conversation_id}-${item.created_at}`}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: shSpace[2] }} />}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => void cargar(1, "refresco")} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hayMas) cargarMas();
        }}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="wifi-off"
              title="No pudimos cargar las escalaciones"
              description={error}
              action={{ label: "Reintentar", onPress: () => void cargar(1, "refresco") }}
              testID="escalaciones-error"
            />
          ) : (
            <EmptyState
              icon="priority-high"
              title={motivo ? "No hay escalaciones con este motivo" : "No hay escalaciones"}
              description={
                motivo
                  ? "Prueba con otro motivo o quita el filtro."
                  : "Cuando el agente derive una conversación a una persona, aparecerá aquí."
              }
              action={
                motivo
                  ? { label: "Limpiar filtro", onPress: () => setMotivo(undefined) }
                  : { label: "Ver conversaciones", onPress: onVerConversaciones }
              }
              testID="escalaciones-vacio"
            />
          )
        }
        ListFooterComponent={
          cargandoMas ? (
            <ActivityIndicator style={styles.pie} color={c.link} testID="escalaciones-cargando-mas" />
          ) : hayMas ? (
            <Button variant="link" size="sm" onPress={cargarMas} testID="escalaciones-mas">
              Cargar más
            </Button>
          ) : undefined
        }
        renderItem={({ item }) => (
          <TarjetaEscalacion
            escalacion={item}
            onAbrir={() => abrir(item)}
            onVerResumen={() => setResumen(item)}
          />
        )}
      />

      <ResumenEscalacionSheet
        escalacion={resumen}
        visible={resumen !== null}
        onClose={() => setResumen(null)}
        onAbrir={() => {
          if (!resumen) return;
          const item = resumen;
          setResumen(null);
          abrir(item);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  lista: { gap: shSpace[2], paddingBottom: shSpace[6] },
  esqueleto: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[3],
    borderWidth: 1,
    borderRadius: 12,
    padding: shSpace[3],
  },
  esqueletoTexto: { flex: 1, gap: shSpace[2] },
  aviso: {
    flexDirection: "row",
    alignItems: "center",
    gap: shSpace[2],
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: shSpace[3],
    paddingVertical: shSpace[1],
    marginBottom: shSpace[2],
  },
  pie: { paddingVertical: shSpace[4] },
});
