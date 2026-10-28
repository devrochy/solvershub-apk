import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { shSpace, shType } from "@core/theme/tokens";
import { useAdminApi } from "@core/session/use-admin-api";
import { Button, EmptyState, Skeleton, useKit } from "@shared/ui";
import { listarConexiones, type ConversationConnection, type ConversationSummary } from "../api";
import { useConversacionesEnVivo } from "../use-en-vivo";
import { FiltrosConversaciones, type FiltrosDeConversaciones } from "./FiltrosConversaciones";
import { TarjetaConversacion } from "./TarjetaConversacion";

function EsqueletoTarjeta() {
  const { c } = useKit();
  return (
    <View style={[styles.esqueleto, { borderColor: c.borderSoft, backgroundColor: c.surface }]}>
      <Skeleton shape="circle" height={40} />
      <View style={styles.esqueletoTexto}>
        <Skeleton width="55%" height={14} />
        <Skeleton width="85%" height={12} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
  );
}

/** Pestaña Conversaciones: filtros, tarjetas, refresco, paginación y lista en vivo. */
export function PestanaConversaciones({
  onAbrir,
}: {
  onAbrir: (conversacion: ConversationSummary) => void;
}) {
  const { c } = useKit();
  const api = useAdminApi();
  const enfocada = useIsFocused();
  const [filtros, setFiltros] = useState<FiltrosDeConversaciones>({ q: "" });
  const [busqueda, setBusqueda] = useState("");
  const [conexiones, setConexiones] = useState<ConversationConnection[]>([]);

  useEffect(() => {
    const temporizador = setTimeout(() => setBusqueda(filtros.q), filtros.q ? 350 : 0);
    return () => clearTimeout(temporizador);
  }, [filtros.q]);

  useEffect(() => {
    let vigente = true;
    void listarConexiones(api)
      .then((lista) => {
        if (vigente) setConexiones(lista);
      })
      .catch(() => {
        // Sin conexiones el filtro se oculta; la bandeja sigue funcionando.
      });
    return () => {
      vigente = false;
    };
  }, [api]);

  const {
    items,
    hayMas,
    cargando,
    cargandoMas,
    refrescando,
    error,
    recargar,
    cargarMas,
  } = useConversacionesEnVivo(
    api,
    {
      q: busqueda.trim() || undefined,
      status: filtros.status,
      connection_id: filtros.connectionId,
    },
    enfocada,
  );

  const cambiarFiltros = useCallback((cambios: Partial<FiltrosDeConversaciones>) => {
    setFiltros((actuales) => ({ ...actuales, ...cambios }));
  }, []);

  const limpiar = useCallback(() => {
    setFiltros({ q: "" });
    setBusqueda("");
  }, []);

  const hayFiltros = Boolean(filtros.q || filtros.status || filtros.connectionId);

  if (cargando && items.length === 0) {
    return (
      <View style={styles.contenedor}>
        <FiltrosConversaciones filtros={filtros} conexiones={conexiones} onChange={cambiarFiltros} />
        <View testID="conversaciones-cargando" accessibilityState={{ busy: true }} style={styles.lista}>
          {[0, 1, 2, 3].map((i) => (
            <EsqueletoTarjeta key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <FiltrosConversaciones filtros={filtros} conexiones={conexiones} onChange={cambiarFiltros} />

      {error && items.length > 0 ? (
        <View style={[styles.aviso, { backgroundColor: c.statusDangerBg, borderColor: c.statusDangerBorder }]}>
          <Text accessibilityLiveRegion="polite" style={[shType.caption, { color: c.statusDangerFg }]}>
            {error}
          </Text>
          <Button variant="link" size="sm" onPress={() => void recargar()}>
            Reintentar
          </Button>
        </View>
      ) : null}

      <FlatList
        testID="lista-conversaciones"
        data={items}
        keyExtractor={(chat) => chat.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refrescando} onRefresh={() => void recargar()} />
        }
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: shSpace[2] }} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hayMas) void cargarMas();
        }}
        ListEmptyComponent={
          error ? (
            <EmptyState
              icon="wifi-off"
              title="No pudimos cargar las conversaciones"
              description={error}
              action={{ label: "Reintentar", onPress: () => void recargar() }}
              testID="conversaciones-error"
            />
          ) : (
            <EmptyState
              icon="forum"
              title={hayFiltros ? "Sin resultados" : "Sin conversaciones por ahora"}
              description={
                hayFiltros
                  ? "Prueba con otro estado, conexión o búsqueda."
                  : "Aparecerán aquí en cuanto un cliente escriba."
              }
              action={
                hayFiltros
                  ? { label: "Limpiar filtros", onPress: limpiar }
                  : { label: "Actualizar", onPress: () => void recargar() }
              }
              testID="conversaciones-vacio"
            />
          )
        }
        ListFooterComponent={
          cargandoMas ? (
            <ActivityIndicator style={styles.pie} color={c.link} testID="conversaciones-cargando-mas" />
          ) : hayMas ? (
            <Button variant="link" size="sm" onPress={() => void cargarMas()} testID="conversaciones-mas">
              Cargar más
            </Button>
          ) : null
        }
        renderItem={({ item }) => (
          <TarjetaConversacion chat={item} onPress={() => onAbrir(item)} />
        )}
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
